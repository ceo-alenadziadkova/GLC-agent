/**
 * Platform-admin token-budget top-up.
 *
 * Increments `audits.token_budget` atomically through the
 * `apply_audit_token_budget_topup` RPC (see migration 076), records a row in
 * `audit_token_budget_grants` (audit log), and emits a `token_budget_topup`
 * event on `pipeline_events` so consultants/clients see the change in the
 * Pipeline Monitor activity log.
 */

import {
  AUDIT_TOKEN_BUDGET_TOPUP_MAX_DELTA,
  AUDIT_TOKEN_BUDGET_TOPUP_MIN_DELTA,
  AUDIT_TOKEN_BUDGET_TOPUP_REASON_MAX_LEN,
} from '../../config/audit-token-budget-topup-policy.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

export type AuditTokenBudgetTopupInputError =
  | 'audit_id_invalid'
  | 'delta_invalid'
  | 'reason_too_long';

export type AuditTokenBudgetTopupRpcError = 'audit_not_found' | 'rpc_failed';

export type AuditTokenBudgetTopupResult = {
  ok: true;
  grant_id: string;
  previous_budget: number;
  token_budget: number;
  tokens_used: number;
  tokens_remaining: number;
};

export type AuditTokenBudgetTopupOutcome =
  | AuditTokenBudgetTopupResult
  | { ok: false; reason: AuditTokenBudgetTopupInputError | AuditTokenBudgetTopupRpcError };

export type AuditTokenBudgetTopupInput = {
  auditId: string;
  grantedByUserId: string;
  deltaTokens: number;
  reason?: string | null;
};

function validateInput(input: AuditTokenBudgetTopupInput): AuditTokenBudgetTopupInputError | null {
  if (!input.auditId || typeof input.auditId !== 'string') return 'audit_id_invalid';
  if (
    !Number.isInteger(input.deltaTokens) ||
    input.deltaTokens < AUDIT_TOKEN_BUDGET_TOPUP_MIN_DELTA ||
    input.deltaTokens > AUDIT_TOKEN_BUDGET_TOPUP_MAX_DELTA
  ) {
    return 'delta_invalid';
  }
  if (input.reason != null && input.reason.length > AUDIT_TOKEN_BUDGET_TOPUP_REASON_MAX_LEN) {
    return 'reason_too_long';
  }
  return null;
}

type RpcRow = {
  grant_id: string;
  previous_budget: number;
  new_budget: number;
  tokens_used: number;
};

export async function applyAuditTokenBudgetTopup(
  input: AuditTokenBudgetTopupInput,
): Promise<AuditTokenBudgetTopupOutcome> {
  const validation = validateInput(input);
  if (validation) return { ok: false, reason: validation };

  const trimmedReason =
    typeof input.reason === 'string' ? input.reason.trim() : '';
  const rpcReason = trimmedReason.length > 0 ? trimmedReason : null;

  const { data, error } = await supabase.rpc('apply_audit_token_budget_topup', {
    p_audit_id: input.auditId,
    p_granted_by: input.grantedByUserId,
    p_delta: input.deltaTokens,
    p_reason: rpcReason,
  });

  if (error) {
    if (typeof error.message === 'string' && error.message.includes('audit_not_found')) {
      return { ok: false, reason: 'audit_not_found' };
    }
    logger.error('audit_token_budget_topup.rpc_failed', {
      audit_id: input.auditId,
      delta_tokens: input.deltaTokens,
      error: error.message,
    });
    return { ok: false, reason: 'rpc_failed' };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null | undefined;
  if (!row) {
    logger.error('audit_token_budget_topup.rpc_empty_result', {
      audit_id: input.auditId,
      delta_tokens: input.deltaTokens,
    });
    return { ok: false, reason: 'rpc_failed' };
  }

  const newBudget = Number(row.new_budget);
  const previousBudget = Number(row.previous_budget);
  const tokensUsed = Number(row.tokens_used);

  await supabase.from('pipeline_events').insert({
    audit_id: input.auditId,
    phase: -1,
    event_type: PIPELINE_EVENT_TYPES.tokenBudgetTopup,
    message: `Platform admin increased token budget by ${input.deltaTokens.toLocaleString('en-US')} tokens (${previousBudget.toLocaleString('en-US')} → ${newBudget.toLocaleString('en-US')}).`,
    data: {
      actor_user_id: input.grantedByUserId,
      delta_tokens: input.deltaTokens,
      previous_budget: previousBudget,
      new_budget: newBudget,
      tokens_used: tokensUsed,
      reason: rpcReason,
      grant_id: row.grant_id,
    },
  });

  return {
    ok: true,
    grant_id: row.grant_id,
    previous_budget: previousBudget,
    token_budget: newBudget,
    tokens_used: tokensUsed,
    tokens_remaining: Math.max(0, newBudget - tokensUsed),
  };
}
