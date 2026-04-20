import { loadPrompt } from '../../agents/base.js';
import { MIN_TOKEN_RESERVE } from '../../config/model.js';
import {
  STRATEGY_EXECUTION_PACK_LIMITS,
  STRATEGY_EXECUTION_PATH_TYPES,
} from '../../config/strategy-initiative-policy.js';
import { fetchAuditByIdForUser } from '../../repositories/audits/audit-read-model.repository.js';
import type { StrategyExecutionPackOutput, StrategyInitiative } from '../../schemas/domain-output.js';
import { StrategyInitiativeSchema } from '../../schemas/domain-output.js';
import { supabase } from '../supabase.js';
import { TokenTracker } from '../token-tracker.js';
import {
  flattenNormalizedStrategyInitiativeBuckets,
  normalizeAuditStrategyRowForReadModel,
} from './strategy-audit-read-normalize.js';
import { invokeStrategyExecutionPackClaude } from './strategy-execution-pack-claude.js';

const EP = STRATEGY_EXECUTION_PACK_LIMITS;

function flattenInitiatives(strategy: Record<string, unknown>): StrategyInitiative[] {
  const keys = ['quick_wins', 'medium_term', 'strategic'] as const;
  const out: StrategyInitiative[] = [];
  for (const k of keys) {
    const arr = strategy[k];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const p = StrategyInitiativeSchema.safeParse(item);
      if (p.success) out.push(p.data);
    }
  }
  return out;
}

export class StrategyExecutionPackError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'NOT_READY' | 'PAYLOAD_INVALID' | 'TOKEN_BUDGET' | 'PERSIST_FAILED' | 'UPSTREAM',
  ) {
    super(message);
    this.name = 'StrategyExecutionPackError';
  }
}

export async function createStrategyExecutionPack(args: {
  auditId: string;
  userId: string;
  initiativeIds: string[];
  selectedPathType?: (typeof STRATEGY_EXECUTION_PATH_TYPES)[number];
}): Promise<{ id: string; payload: StrategyExecutionPackOutput }> {
  const { auditId, userId, initiativeIds } = args;
  if (!Array.isArray(initiativeIds) || initiativeIds.length === 0) {
    throw new StrategyExecutionPackError('initiative_ids required', 'PAYLOAD_INVALID');
  }
  if (initiativeIds.length > EP.maxInitiativesPerRequest) {
    throw new StrategyExecutionPackError('too_many_initiatives', 'PAYLOAD_INVALID');
  }
  if (
    args.selectedPathType !== undefined &&
    !(STRATEGY_EXECUTION_PATH_TYPES as readonly string[]).includes(args.selectedPathType)
  ) {
    throw new StrategyExecutionPackError('invalid_path_type', 'PAYLOAD_INVALID');
  }

  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(auditId, userId);
  if (auditErr || !audit) {
    throw new StrategyExecutionPackError('audit_not_found', 'NOT_FOUND');
  }

  const [{ data: strategy, error: stErr }, { data: briefRow }, { data: domainRows }] = await Promise.all([
    supabase.from('audit_strategy').select('*').eq('audit_id', auditId).single(),
    supabase.from('intake_brief').select('responses').eq('audit_id', auditId).maybeSingle(),
    supabase.from('audit_domains').select('domain_key, issues').eq('audit_id', auditId).eq('status', 'completed'),
  ]);
  if (stErr || !strategy || strategy.status !== 'completed') {
    throw new StrategyExecutionPackError('strategy_not_ready', 'NOT_READY');
  }

  const briefResponses =
    briefRow?.responses && typeof briefRow.responses === 'object' && !Array.isArray(briefRow.responses)
      ? (briefRow.responses as Record<string, unknown>)
      : null;

  const normalized = normalizeAuditStrategyRowForReadModel({
    strategy: strategy as unknown as Record<string, unknown>,
    domainRows: (domainRows ?? []) as Array<{ domain_key: string; issues?: unknown }>,
    briefResponses,
  });
  const strategyRec = (normalized ?? strategy) as unknown as Record<string, unknown>;
  const all = normalized ? flattenNormalizedStrategyInitiativeBuckets(strategyRec) : flattenInitiatives(strategyRec);
  const idSet = new Set(initiativeIds);
  const selected = all.filter((i) => idSet.has(i.id));
  if (selected.length !== initiativeIds.length) {
    throw new StrategyExecutionPackError('initiative_not_found', 'PAYLOAD_INVALID');
  }

  const tokenTracker = new TokenTracker();
  const budget = await tokenTracker.checkBudget(auditId);
  if (!budget.within_budget || budget.remaining < MIN_TOKEN_RESERVE) {
    throw new StrategyExecutionPackError('token_budget', 'TOKEN_BUDGET');
  }

  const system = loadPrompt('strategy-execution-pack');
  const user = [
    'Generate execution packs for the following initiatives. Respect selected_path_type when narrowing recommendations.',
    '',
    `selected_path_type: ${args.selectedPathType ?? 'balanced'}`,
    '',
    'initiatives_json:',
    JSON.stringify(selected, null, 2),
  ].join('\n');

  const payload = await invokeStrategyExecutionPackClaude({ auditId, system, user });

  const packIds = new Set(payload.packs.map((p) => p.initiative_id));
  for (const id of initiativeIds) {
    if (!packIds.has(id)) {
      throw new StrategyExecutionPackError('pack_missing_for_initiative', 'PAYLOAD_INVALID');
    }
  }

  const { data: row, error: insErr } = await supabase
    .from('audit_strategy_execution_packs')
    .insert({
      audit_id: auditId,
      created_by_user_id: userId,
      initiative_ids: initiativeIds,
      selected_path_type: args.selectedPathType ?? null,
      payload: payload as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (insErr || !row) {
    throw new StrategyExecutionPackError(insErr?.message ?? 'insert_failed', 'PERSIST_FAILED');
  }

  return { id: row.id, payload };
}

export async function listStrategyExecutionPacks(args: { auditId: string; userId: string }) {
  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(args.auditId, args.userId);
  if (auditErr || !audit) {
    throw new StrategyExecutionPackError('audit_not_found', 'NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('audit_strategy_execution_packs')
    .select('id, initiative_ids, selected_path_type, created_at')
    .eq('audit_id', args.auditId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new StrategyExecutionPackError(error.message, 'UPSTREAM');
  }
  return data ?? [];
}
