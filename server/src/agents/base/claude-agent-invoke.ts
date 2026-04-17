/**
 * Single Claude completion with tool output, validation, retries, and circuit breaker.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import {
  CLAUDE_API_TIMEOUT_ABORT_REASON,
  CLAUDE_DOMAIN_SUBMIT_TOOL_NAME,
} from '../../config/agent-claude-contract.js';
import {
  CLAUDE_CB_THRESHOLD,
  CLAUDE_CB_TTL_SEC,
  CLAUDE_MAX_RETRIES,
  CLAUDE_RETRY_BASE_MS,
  CLAUDE_RETRY_JITTER_MS,
  CLAUDE_TIMEOUT_MS,
} from '../../config/claude-client.js';
import { CLAUDE_MODEL } from '../../config/model.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import {
  interpolatePipelineEventMessage,
  pipelineBaseEventCopy,
} from '../../config/pipeline-events-copy.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { zodToJsonSchema } from '../../schemas/domain-output.js';
import type { ContextBuilder, AgentContext } from '../../services/context-builder.js';
import { logger } from '../../services/logger.js';
import type { TokenTracker } from '../../services/token-tracker.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';

import {
  getConsecutiveClaudeFailures,
  recordClaudeFailure,
  resetClaudeFailures,
} from './claude-circuit-breaker.js';

const CLAUDE_RETRYABLE_HTTP_STATUSES = new Set<number>(SYSTEM_DEFAULTS.claudeHttp.retryableAnthropicStatuses);
const CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES = new Set<number>(
  SYSTEM_DEFAULTS.claudeHttp.circuitBreakerAnthropicStatuses,
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ClaudeAgentInvokeDeps = {
  anthropic: Anthropic;
  auditId: string;
  phaseNumber: number;
  domainKey: DomainKey | 'recon' | 'strategy';
  contextBuilder: ContextBuilder;
  tokenTracker: TokenTracker;
  emit: (eventType: string, message: string, data?: Record<string, unknown>) => Promise<void>;
};

export type ClaudeAgentInvokeParams = {
  context: AgentContext;
  schema: z.ZodSchema;
  maxTokens: number;
};

export async function callClaudeWithRetry(
  deps: ClaudeAgentInvokeDeps,
  params: ClaudeAgentInvokeParams,
): Promise<DomainResult> {
  const { anthropic, auditId, phaseNumber, domainKey, contextBuilder, tokenTracker, emit } = deps;
  const { context, schema, maxTokens } = params;

  const ev = pipelineBaseEventCopy();
  const { system, prompt, truncated, truncatedKeys } = contextBuilder.formatPrompt(context);
  if (truncated) {
    await emit(
      'warning',
      interpolatePipelineEventMessage(ev.contextTruncated, { keys: truncatedKeys.join(', ') }),
    );
  }
  const jsonSchema = zodToJsonSchema(schema);
  const toolName = CLAUDE_DOMAIN_SUBMIT_TOOL_NAME;

  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    try {
      const consecutiveFailures = await getConsecutiveClaudeFailures();
      if (consecutiveFailures >= CLAUDE_CB_THRESHOLD) {
        throw new Error(
          `Claude circuit breaker open: ${consecutiveFailures} consecutive server failures in ${CLAUDE_CB_TTL_SEC}s window`,
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(CLAUDE_API_TIMEOUT_ABORT_REASON), CLAUDE_TIMEOUT_MS);
      let response: Awaited<ReturnType<Anthropic['messages']['create']>>;
      try {
        response = await anthropic.messages.create(
          {
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: prompt }],
            tools: [
              {
                name: toolName,
                description: ev.claudeToolDescription,
                input_schema: jsonSchema as Anthropic.Tool['input_schema'],
              },
            ],
            tool_choice: { type: 'tool', name: toolName },
          },
          {
            signal: controller.signal,
          },
        );
      } finally {
        clearTimeout(timer);
      }
      await resetClaudeFailures();

      const toolBlock = response.content.find((b) => b.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('Claude did not return tool_use response');
      }

      await tokenTracker.log(auditId, phaseNumber, {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: CLAUDE_MODEL,
      });

      const parsed = schema.safeParse(toolBlock.input);
      if (!parsed.success) {
        await emit(
          PIPELINE_EVENT_TYPES.log,
          interpolatePipelineEventMessage(ev.validationErrorAttempt, {
            attempt,
            message: parsed.error.message,
          }),
        );
        if (attempt === CLAUDE_MAX_RETRIES) {
          throw new Error(
            `Response validation failed after ${CLAUDE_MAX_RETRIES} attempts: ${parsed.error.message}`,
          );
        }
        continue;
      }

      return parsed.data as DomainResult;
    } catch (err) {
      const error = err as Error & { status?: number };
      const status = error.status;

      const shouldRetry =
        status !== undefined && CLAUDE_RETRYABLE_HTTP_STATUSES.has(status) && attempt < CLAUDE_MAX_RETRIES;
      if (shouldRetry) {
        if (CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES.has(status)) {
          await recordClaudeFailure();
        }
        const jitter = Math.floor(Math.random() * CLAUDE_RETRY_JITTER_MS);
        const delay = CLAUDE_RETRY_BASE_MS * Math.pow(2, attempt - 1) + jitter;
        await emit(
          PIPELINE_EVENT_TYPES.log,
          interpolatePipelineEventMessage(ev.apiErrorRetry, { status: status ?? 0, delay }),
        );
        await sleep(delay);
        continue;
      }
      if (status !== undefined && CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES.has(status)) {
        await recordClaudeFailure();
      }

      logger.error('Claude call failed', {
        phase: phaseNumber,
        domain_key: domainKey,
        attempt,
        status: error.status ?? null,
        error: error.message,
      });
      throw err;
    }
  }

  throw new Error('All retry attempts failed');
}
