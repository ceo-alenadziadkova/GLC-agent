import { supabase } from './supabase.js';
import { getModelPricing, BUDGET_WARNING_THRESHOLD } from '../config/model.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { roundTokenCostUsd } from '../config/token-cost-rounding.js';
import { formatTokenUsagePipelineEventMessage } from '../config/token-usage-messages.en.js';
import { logger } from './logger.js';
import { getContext, updateContext } from './observability-context.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../config/orchestration-telemetry-policy.js';

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  model: string;
}

type TokenLogMetadata = {
  latency_ms?: number;
  attempt?: number;
  max_attempts?: number;
  provider_status?: number | null;
  status?: 'started' | 'completed' | 'failed';
  call_type?: 'domain_agent' | 'strategy_execution_pack' | 'orchestration_synthesis';
  detail_level?: 'default' | 'debug';
};

export interface BudgetStatus {
  within_budget: boolean;
  tokens_used: number;
  token_budget: number;
  remaining: number;
  /** true when tokens_used >= BUDGET_WARNING_THRESHOLD (80%) of budget */
  is_approaching_limit: boolean;
}

export class TokenTracker {
  /**
   * Log token usage for a phase and update audit totals.
   */
  async log(auditId: string, phase: number, usage: TokenUsage, metadata: TokenLogMetadata = {}): Promise<void> {
    const totalTokens = usage.input_tokens + usage.output_tokens;
    const pricing = getModelPricing(usage.model);
    const costUsd = (usage.input_tokens / 1_000_000) * pricing.input + (usage.output_tokens / 1_000_000) * pricing.output;
    const roundedCost = roundTokenCostUsd(costUsd);
    updateContext({ auditId });
    const context = getContext();

    logger.info('llm_cost.per_call', {
      audit_id: auditId,
      component: 'token_tracker',
      phase,
      call_type: metadata.call_type ?? 'domain_agent',
      [ORCHESTRATION_TELEMETRY_METRICS.llmCostPerAuditUsd]: roundedCost,
    });

    // Log event
    await supabase.from('pipeline_events').insert({
      audit_id: auditId,
      phase,
      event_type: PIPELINE_EVENT_TYPES.tokenUsage,
      message: formatTokenUsagePipelineEventMessage({ phase, totalTokens, costUsd: roundedCost }),
      data: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: totalTokens,
        model: usage.model,
        cost_usd: roundedCost,
        latency_ms: metadata.latency_ms,
        attempt: metadata.attempt,
        max_attempts: metadata.max_attempts,
        provider_status: metadata.provider_status ?? null,
        status: metadata.status ?? 'completed',
        call_type: metadata.call_type ?? 'domain_agent',
        detail_level: metadata.detail_level ?? 'default',
        trace_id: context?.traceId,
        operation_id: context?.operationId,
      },
    });

    // Atomic increment — avoids read-then-write race condition when multiple
    // phases log concurrently. Uses Postgres RPC so the increment is a single
    // UPDATE tokens_used = tokens_used + $1 without a separate SELECT.
    const { error: rpcError } = await supabase.rpc('increment_tokens_used', {
      audit_id_input: auditId,
      increment: totalTokens,
    });

    if (rpcError) {
      logger.error('Token increment RPC failed', { audit_id: auditId, error: rpcError.message });
      throw rpcError;
    }
  }

  /**
   * Check if the audit is within its token budget.
   * Returns is_approaching_limit=true when usage >= BUDGET_WARNING_THRESHOLD of budget.
   */
  async checkBudget(auditId: string): Promise<BudgetStatus> {
    const { data: audit } = await supabase
      .from('audits')
      .select('tokens_used, token_budget')
      .eq('id', auditId)
      .single();

    if (!audit) {
      return { within_budget: false, tokens_used: 0, token_budget: 0, remaining: 0, is_approaching_limit: false };
    }

    const remaining = audit.token_budget - audit.tokens_used;
    const is_approaching_limit = audit.tokens_used >= audit.token_budget * BUDGET_WARNING_THRESHOLD;

    return {
      within_budget: audit.tokens_used < audit.token_budget,
      tokens_used: audit.tokens_used,
      token_budget: audit.token_budget,
      remaining,
      is_approaching_limit,
    };
  }

  /**
   * Get total cost for an audit.
   */
  async getAuditCost(auditId: string): Promise<{ total_tokens: number; total_cost_usd: number; per_phase: Record<number, { tokens: number; cost: number }> }> {
    const { data: events } = await supabase
      .from('pipeline_events')
      .select('phase, data')
      .eq('audit_id', auditId)
      .eq('event_type', PIPELINE_EVENT_TYPES.tokenUsage);

    let totalTokens = 0;
    let totalCost = 0;
    const perPhase: Record<number, { tokens: number; cost: number }> = {};

    for (const event of events ?? []) {
      const d = event.data as { total_tokens?: number; cost_usd?: number };
      const tokens = d.total_tokens ?? 0;
      const cost = d.cost_usd ?? 0;
      totalTokens += tokens;
      totalCost += cost;

      if (!perPhase[event.phase]) {
        perPhase[event.phase] = { tokens: 0, cost: 0 };
      }
      perPhase[event.phase].tokens += tokens;
      perPhase[event.phase].cost += cost;
    }

    return { total_tokens: totalTokens, total_cost_usd: roundTokenCostUsd(totalCost), per_phase: perPhase };
  }
}
