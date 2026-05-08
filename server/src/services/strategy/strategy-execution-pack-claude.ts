/**
 * Single-purpose Claude tool call for Strategy Lab execution packs (no pipeline events).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import {
  CLAUDE_API_TIMEOUT_ABORT_REASON,
} from '../../config/agent-claude-contract.js';
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
  STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME,
  STRATEGY_EXECUTION_PACK_TOKEN_PHASE,
} from '../../config/strategy-initiative-policy.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { zodToJsonSchema, StrategyExecutionPackOutputSchema } from '../../schemas/domain-output.js';
import { logger } from '../logger.js';
import { TokenTracker } from '../token-tracker.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { insertPipelineEventRow } from '../pipeline/events/insert-pipeline-event.js';
import { buildLlmToolValidationFailedEventData } from '../../lib/claude-tool-use-validation-capture.js';

import {
  getConsecutiveClaudeFailures,
  recordClaudeFailure,
  resetClaudeFailures,
} from '../../agents/base/claude-circuit-breaker.js';
import { isLlmPromptCacheEnabled } from '../../config/feature-flags.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../config/orchestration-telemetry-policy.js';

const CLAUDE_RETRYABLE_HTTP_STATUSES = new Set<number>(SYSTEM_DEFAULTS.claudeHttp.retryableAnthropicStatuses);
const CLAUDE_CIRCUIT_BREAKER_HTTP_STATUSES = new Set<number>(
  SYSTEM_DEFAULTS.claudeHttp.circuitBreakerAnthropicStatuses,
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeStrategyExecutionPackClaude(args: {
  auditId: string;
  system: string;
  user: string;
}): Promise<z.infer<typeof StrategyExecutionPackOutputSchema>> {
  const anthropic: Anthropic = createAnthropicClient();
  const tokenTracker = new TokenTracker();
  const schema = StrategyExecutionPackOutputSchema;
  const jsonSchema = zodToJsonSchema(schema);
  const toolName = STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME;
  const maxTokens = MODEL_MAX_TOKENS.strategyExecutionPack;
  const phaseNumber = STRATEGY_EXECUTION_PACK_TOKEN_PHASE;

  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    const callStartedAt = Date.now();
    await insertPipelineEventRow({
      auditId: args.auditId,
      phase: phaseNumber,
      eventType: PIPELINE_EVENT_TYPES.llmCallStarted,
      message: 'LLM call started',
      data: {
        detail_level: 'debug',
        call_type: 'strategy_execution_pack',
        attempt,
        max_attempts: CLAUDE_MAX_RETRIES,
        model: CLAUDE_MODEL,
      },
    });
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
        const systemParam: Parameters<Anthropic['messages']['create']>[0]['system'] = isLlmPromptCacheEnabled()
          ? [
              {
                type: 'text',
                text: args.system,
                cache_control: { type: 'ephemeral' },
              },
            ]
          : args.system;
        const toolsBlock = {
          name: toolName,
          description: 'Submit structured execution packs for selected strategy initiatives.',
          input_schema: jsonSchema as Anthropic.Tool['input_schema'],
          ...(isLlmPromptCacheEnabled() ? { cache_control: { type: 'ephemeral' as const } } : {}),
        } as Anthropic.Tool;
        response = await anthropic.messages.create(
          {
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            system: systemParam,
            messages: [{ role: 'user', content: args.user }],
            tools: [toolsBlock],
            tool_choice: { type: 'tool', name: toolName },
          },
          { signal: controller.signal },
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
        logger.info('strategy_execution_pack.cache_metrics', {
          audit_id: args.auditId,
          [ORCHESTRATION_TELEMETRY_METRICS.llmCacheHitRate]: cacheHitRate,
        });
      }

      const toolBlock = response.content.find((b) => b.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('Claude did not return tool_use response');
      }

      await tokenTracker.log(args.auditId, phaseNumber, {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: CLAUDE_MODEL,
      }, {
        latency_ms: Date.now() - callStartedAt,
        attempt,
        max_attempts: CLAUDE_MAX_RETRIES,
        status: 'completed',
        call_type: 'strategy_execution_pack',
        detail_level: 'debug',
      });
      await insertPipelineEventRow({
        auditId: args.auditId,
        phase: phaseNumber,
        eventType: PIPELINE_EVENT_TYPES.llmCallCompleted,
        message: 'LLM call completed',
        data: {
          detail_level: 'debug',
          call_type: 'strategy_execution_pack',
          attempt,
          max_attempts: CLAUDE_MAX_RETRIES,
          latency_ms: Date.now() - callStartedAt,
        },
      });

      const parsed = schema.safeParse(toolBlock.input);
      if (!parsed.success) {
        logger.warn('strategy_execution_pack.validation_failed', {
          audit_id: args.auditId,
          attempt,
          message: parsed.error.message,
        });
        await insertPipelineEventRow({
          auditId: args.auditId,
          phase: phaseNumber,
          eventType: PIPELINE_EVENT_TYPES.llmToolValidationFailed,
          message: 'LLM tool output failed schema validation',
          data: buildLlmToolValidationFailedEventData({
            callType: 'strategy_execution_pack',
            toolName,
            toolUseId: toolBlock.id,
            zodMessage: parsed.error.message,
            toolInput: toolBlock.input,
          }),
        });
        throw new Error(`Execution pack validation failed: ${parsed.error.message}`);
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
      logger.error('strategy_execution_pack.claude_failed', {
        audit_id: args.auditId,
        attempt,
        status: error.status ?? null,
        error: error.message,
      });
      await insertPipelineEventRow({
        auditId: args.auditId,
        phase: phaseNumber,
        eventType: PIPELINE_EVENT_TYPES.llmCallFailed,
        message: 'LLM call failed',
        data: {
          detail_level: 'debug',
          call_type: 'strategy_execution_pack',
          attempt,
          max_attempts: CLAUDE_MAX_RETRIES,
          provider_status: status ?? null,
          latency_ms: Date.now() - callStartedAt,
        },
        rethrowOnError: false,
      });
      throw err;
    }
  }

  throw new Error('All retry attempts failed');
}
