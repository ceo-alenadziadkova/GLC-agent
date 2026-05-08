/**
 * Single Claude completion with tool output, Zod validation, HTTP retries, and circuit breaker.
 * Schema validation does not trigger additional LLM calls (fail fast; capture raw tool JSON to `pipeline_events`).
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
import {
  isDomainOutputCoalitionNormalizeEnabled,
  isLlmPromptCacheEnabled,
} from '../../config/feature-flags.js';
import {
  ORCHESTRATION_TELEMETRY_METRICS,
} from '../../config/orchestration-telemetry-policy.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { buildLlmToolValidationFailedEventData } from '../../lib/claude-tool-use-validation-capture.js';
import { zodToJsonSchema } from '../../schemas/domain-output.js';
import type { ContextBuilder, AgentContext } from '../../services/context-builder.js';
import {
  isDomainAgentOutputKey,
  normalizeDomainAgentToolInputForSchema,
} from '../../services/domain-output/domain-output-coalition-normalize.js';
import { logger } from '../../services/logger.js';
import { normalizeStrategyToolInputForSchema } from '../../services/strategy/strategy-output-tool-normalize.js';
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
  toolName?: string;
};

export async function callClaudeWithRetry<TOutput = DomainResult>(
  deps: ClaudeAgentInvokeDeps,
  params: ClaudeAgentInvokeParams,
): Promise<TOutput> {
  const { anthropic, auditId, phaseNumber, domainKey, contextBuilder, tokenTracker, emit } = deps;
  const { context, schema, maxTokens, toolName = CLAUDE_DOMAIN_SUBMIT_TOOL_NAME } = params;

  const ev = pipelineBaseEventCopy();
  const { system, prompt, truncated, truncatedKeys } = contextBuilder.formatPrompt(context);
  if (truncated) {
    await emit(
      'warning',
      interpolatePipelineEventMessage(ev.contextTruncated, { keys: truncatedKeys.join(', ') }),
    );
  }
  const jsonSchema = zodToJsonSchema(schema);
  const anthropicMessages: Anthropic.Messages.MessageCreateParamsNonStreaming['messages'] = [
    { role: 'user', content: prompt },
  ];
  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    const callStartedAt = Date.now();
    await emit(PIPELINE_EVENT_TYPES.llmCallStarted, 'LLM call started', {
      detail_level: 'debug',
      call_type: 'domain_agent',
      attempt,
      max_attempts: CLAUDE_MAX_RETRIES,
      model: CLAUDE_MODEL,
    });
    try {
      const consecutiveFailures = await getConsecutiveClaudeFailures();
      if (consecutiveFailures >= CLAUDE_CB_THRESHOLD) {
        throw new Error(
          `Claude circuit breaker open: ${consecutiveFailures} consecutive server failures in ${CLAUDE_CB_TTL_SEC}s window`,
        );
      }

      const perCallTimeoutMs =
        domainKey === 'strategy'
          ? SYSTEM_DEFAULTS.claudeHttp.timeoutMsStrategy
          : CLAUDE_TIMEOUT_MS;

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(CLAUDE_API_TIMEOUT_ABORT_REASON),
        perCallTimeoutMs,
      );
      let response: Awaited<ReturnType<Anthropic['messages']['create']>>;
      try {
        const systemParam: Parameters<Anthropic['messages']['create']>[0]['system'] = isLlmPromptCacheEnabled()
          ? [
              {
                type: 'text',
                text: system,
                cache_control: { type: 'ephemeral' },
              },
            ]
          : system;
        const toolBlockDef = {
          name: toolName,
          description: ev.claudeToolDescription,
          input_schema: jsonSchema as Anthropic.Tool['input_schema'],
          ...(isLlmPromptCacheEnabled() ? { cache_control: { type: 'ephemeral' as const } } : {}),
        };
        response = await anthropic.messages.create(
          {
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            system: systemParam,
            messages: anthropicMessages,
            tools: [toolBlockDef as Anthropic.Tool],
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

      const u = response.usage as {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      const cacheRead = u.cache_read_input_tokens ?? 0;
      const cacheCreate = u.cache_creation_input_tokens ?? 0;
      const cacheDen = cacheRead + cacheCreate;
      const cacheHitRate = isLlmPromptCacheEnabled() && cacheDen > 0 ? cacheRead / cacheDen : 0;
      if (isLlmPromptCacheEnabled()) {
        logger.info('domain_agent.cache_metrics', {
          audit_id: auditId,
          domain_key: domainKey,
          [ORCHESTRATION_TELEMETRY_METRICS.llmCacheHitRate]: cacheHitRate,
        });
      }

      const toolBlock = response.content.find((b) => b.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('Claude did not return tool_use response');
      }

      await tokenTracker.log(auditId, phaseNumber, {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: CLAUDE_MODEL,
      }, {
        latency_ms: Date.now() - callStartedAt,
        attempt,
        max_attempts: CLAUDE_MAX_RETRIES,
        status: 'completed',
        call_type: 'domain_agent',
        detail_level: 'debug',
      });
      await emit(PIPELINE_EVENT_TYPES.llmCallCompleted, 'LLM call completed', {
        detail_level: 'debug',
        call_type: 'domain_agent',
        attempt,
        max_attempts: CLAUDE_MAX_RETRIES,
        latency_ms: Date.now() - callStartedAt,
      });

      let parsedInput: unknown = toolBlock.input;
      if (isDomainAgentOutputKey(domainKey) && isDomainOutputCoalitionNormalizeEnabled()) {
        const normalized = normalizeDomainAgentToolInputForSchema(toolBlock.input);
        parsedInput = normalized.value;
        if (normalized.mutated) {
          logger.info('domain_agent.tool_output_coalition_normalized', {
            audit_id: auditId,
            domain_key: domainKey,
            mutation_codes: [...normalized.mutationCodes],
          });
        }
      } else if (domainKey === 'strategy' && isDomainOutputCoalitionNormalizeEnabled()) {
        const normalized = normalizeStrategyToolInputForSchema(toolBlock.input);
        parsedInput = normalized.value;
        if (normalized.mutated) {
          logger.info('domain_agent.tool_output_strategy_normalized', {
            audit_id: auditId,
            domain_key: domainKey,
            mutation_codes: [...normalized.mutationCodes],
          });
        }
      }

      const parsed = schema.safeParse(parsedInput);
      if (!parsed.success) {
        await emit(
          PIPELINE_EVENT_TYPES.log,
          interpolatePipelineEventMessage(ev.validationErrorAttempt, {
            attempt,
            message: parsed.error.message,
          }),
        );
        await emit(
          PIPELINE_EVENT_TYPES.llmToolValidationFailed,
          'LLM tool output failed schema validation',
          buildLlmToolValidationFailedEventData({
            callType: 'domain_agent',
            toolName,
            toolUseId: toolBlock.id,
            zodMessage: parsed.error.message,
            toolInput: toolBlock.input,
          }),
        );
        throw new Error(`Response validation failed: ${parsed.error.message}`);
      }

      return parsed.data as TOutput;
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
      await emit(PIPELINE_EVENT_TYPES.llmCallFailed, 'LLM call failed', {
        detail_level: 'debug',
        call_type: 'domain_agent',
        attempt,
        max_attempts: CLAUDE_MAX_RETRIES,
        provider_status: status ?? null,
        latency_ms: Date.now() - callStartedAt,
      });
      throw err;
    }
  }

  throw new Error('All retry attempts failed');
}
