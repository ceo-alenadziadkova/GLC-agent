import {
  mergeStrategyLabContextForStorage,
  parseStoredStrategyLabContext,
  type StrategyLabContextPatch,
  type StrategyLabContextPersisted,
} from '../../config/strategy-lab-context-policy.js';
import { fetchAuditByIdForUser } from '../../repositories/audits/audit-read-model.repository.js';
import { supabase } from '../supabase.js';

export class StrategyLabContextError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'STRATEGY_ROW_MISSING' | 'PERSIST_FAILED',
  ) {
    super(message);
    this.name = 'StrategyLabContextError';
  }
}

export async function patchStrategyLabContext(args: {
  auditId: string;
  userId: string;
  patch: StrategyLabContextPatch;
}): Promise<{ strategy_lab_context: StrategyLabContextPersisted }> {
  const { auditId, userId, patch } = args;
  const { data: audit, error: aErr } = await fetchAuditByIdForUser(auditId, userId);
  if (aErr || !audit) {
    throw new StrategyLabContextError('audit_not_found', 'NOT_FOUND');
  }

  const { data: row, error: rErr } = await supabase
    .from('audit_strategy')
    .select('strategy_lab_context')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (rErr) {
    throw new StrategyLabContextError(rErr.message, 'PERSIST_FAILED');
  }
  if (!row) {
    throw new StrategyLabContextError('strategy_row_missing', 'STRATEGY_ROW_MISSING');
  }

  const next = mergeStrategyLabContextForStorage(row.strategy_lab_context, patch);
  const { error: uErr } = await supabase.from('audit_strategy').update({ strategy_lab_context: next }).eq('audit_id', auditId);
  if (uErr) {
    throw new StrategyLabContextError(uErr.message, 'PERSIST_FAILED');
  }

  return { strategy_lab_context: parseStoredStrategyLabContext(next) };
}
