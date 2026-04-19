/**
 * Single Claude tool call for optional GLC orchestration conflict synthesis (no pipeline events).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import { CLAUDE_API_TIMEOUT_ABORT_REASON } from '../../config/agent-claude-contract.js';
import {
  createAnthropicClient,
  CLAUDE_CB_THRESHOLD,
  CLAUDE_CB_TTL_SEC,
  CLAUDE_MAX_RETRIES,
  CLAUDE_RETRY_BASE_MS,
  CLAUDE_RETRY_JITTER_MS,
  CLAUDE_TIMEOUT_MS,
} from '../../config/claude-client.js';
import { CLAUDE_MODEL, MODEL_MAX_TOKENS } from '../../config/model.js';
import {
  ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME,
  ORCHESTRATION_SYNTHESIS_TOKEN_PHASE,
} from '../../config/orchestration-synthesis-policy.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { GlcOrchestrationSynthesisToolSchema } from '../../schemas/glc-orchestration-synthesis-tool.js';
import { zodToJsonSchema } from '../../schemas/domain-output.js';
import { logger } from '../logger.js';
import { TokenTracker } from '../token-tracker.js';

import {
  getConsecutiveClaudeFailures,
  recordClaudeFailure,
  resetClaudeFailures,
} from '../../agents/base/claude-circuit-breaker.js';

const CLAUDE_RETRYABLE_HTTP_STATUSES = new Set<number>(SYSTEM_DEFAULTS.claudeHttp.retryableAnthropicStatuses);
const CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES = new Set<number>(
  SYSTEM_DEFAULTS.claudeHttp.circuitBreakerAnthropicStatuses,
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeOrchestrationPackSynthesisClaude(args: {
  auditId: string;
  system: string;
  user: string;
}): Promise<z.infer<typeof GlcOrchestrationSynthesisToolSchema>> {
  const anthropic: Anthropic = createAnthropicClient();
  const tokenTracker = new TokenTracker();
  const schema = GlcOrchestrationSynthesisToolSchema;
  const jsonSchema = zodToJsonSchema(schema);
  const toolName = ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME;
  const maxTokens = MODEL_MAX_TOKENS.orchestrationSynthesis;
  const phaseNumber = ORCHESTRATION_SYNTHESIS_TOKEN_PHASE;

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
            system: args.system,
            messages: [{ role: 'user', content: args.user }],
            tools: [
              {
                name: toolName,
                description:
                  'Submit cross-domain orchestration synthesis: constraint read, narrative conflict resolutions.',
                input_schema: jsonSchema as Anthropic.Tool['input_schema'],
              },
            ],
            tool_choice: { type: 'tool', name: toolName },
          },
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timer);
      }
      await resetClaudeFailures();

      const toolBlock = response.content.find((b) => b.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('Claude did not return tool_use response');
      }

      await tokenTracker.log(args.auditId, phaseNumber, {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: CLAUDE_MODEL,
      });

      const parsed = schema.safeParse(toolBlock.input);
      if (!parsed.success) {
        logger.warn('orchestration_synthesis.validation_retry', {
          audit_id: args.auditId,
          attempt,
          message: parsed.error.message,
        });
        if (attempt === CLAUDE_MAX_RETRIES) {
          throw new Error(
            `Orchestration synthesis validation failed after ${CLAUDE_MAX_RETRIES} attempts: ${parsed.error.message}`,
          );
        }
        continue;
      }

      return parsed.data;
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
        await sleep(delay);
        continue;
      }
      if (status !== undefined && CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES.has(status)) {
        await recordClaudeFailure();
      }
      logger.error('orchestration_synthesis.claude_failed', {
        audit_id: args.auditId,
        attempt,
        status: error.status ?? null,
        error: error.message,
      });
      throw err;
    }
  }

  throw new Error('All retry attempts failed');
}
