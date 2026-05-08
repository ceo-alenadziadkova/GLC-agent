import { PLAN_BOARD_COLUMN_POLICY_LIMITS } from '../../config/plan-board-column-policy-limits.js';
import { PLAN_BOARD_DEFAULT_COLUMN_TITLES_EN } from '../../config/plan-board-default-column-titles.en.js';
import {
  PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS,
  PLAN_BOARD_SEMANTIC_KEYS,
  type PlanBoardSemanticKey,
} from '../../config/plan-board-semantics.js';
import { PlanBoardColumnPolicyPutSchema, type PlanBoardColumnPolicyPut } from '../../schemas/plan-board-column-policy.js';
import { PLAN_BOARD_COLUMN_DEFAULT_IDS } from '../../config/plan-board-columns.js';
import { supabase } from '../supabase.js';

export type ResolvedPlanBoardColumn = {
  id: string;
  title: string;
  semantic: PlanBoardSemanticKey | null;
  visible_to_client: boolean;
};

export type ResolvedPlanBoardPolicy = {
  schema_version: 1;
  columns: ResolvedPlanBoardColumn[];
  allowedColumnIds: readonly string[];
  semanticsToColumnId: Record<PlanBoardSemanticKey, string>;
  landingPackCardColumnId: string;
  clientVisibleColumnIds: ReadonlySet<string>;
  defaultDeliveryAreaForColumnId(columnId: string): 'backlog' | 'board';
};

function buildColumnIdToSemanticMap(resolved: ResolvedPlanBoardPolicy): Map<string, PlanBoardSemanticKey> {
  const m = new Map<string, PlanBoardSemanticKey>();
  for (const c of resolved.columns) {
    if (c.semantic != null) m.set(c.id, c.semantic);
  }
  return m;
}

export function remapPlanBoardCardColumnIdBetweenPolicies(args: {
  oldResolved: ResolvedPlanBoardPolicy;
  newResolved: ResolvedPlanBoardPolicy;
  columnId: string;
}): string {
  const oldMap = buildColumnIdToSemanticMap(args.oldResolved);
  const semantic = oldMap.get(args.columnId) ?? ('backlog' as PlanBoardSemanticKey);
  return args.newResolved.semanticsToColumnId[semantic];
}

export function buildDefaultResolvedPlanBoardPolicy(): ResolvedPlanBoardPolicy {
  const semanticsToColumnId = Object.fromEntries(PLAN_BOARD_SEMANTIC_KEYS.map((k) => [k, k])) as Record<
    PlanBoardSemanticKey,
    string
  >;
  const columns: ResolvedPlanBoardColumn[] = PLAN_BOARD_SEMANTIC_KEYS.map((semantic) => ({
    id: semantic,
    title: PLAN_BOARD_DEFAULT_COLUMN_TITLES_EN[semantic],
    semantic,
    visible_to_client: PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS.has(semantic),
  }));
  const clientVisibleColumnIds = new Set(
    PLAN_BOARD_SEMANTIC_KEYS.filter((s) => PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS.has(s)).map((s) => semanticsToColumnId[s]),
  );
  return {
    schema_version: PLAN_BOARD_COLUMN_POLICY_LIMITS.schemaVersion,
    columns,
    allowedColumnIds: [...PLAN_BOARD_SEMANTIC_KEYS],
    semanticsToColumnId,
    landingPackCardColumnId: PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog,
    clientVisibleColumnIds,
    defaultDeliveryAreaForColumnId(columnId: string): 'backlog' | 'board' {
      return columnId === semanticsToColumnId.backlog ? 'backlog' : 'board';
    },
  };
}

function toResolved(policy: PlanBoardColumnPolicyPut): ResolvedPlanBoardPolicy {
  const sem = policy.semantics;
  const targets = [
    sem.backlog,
    sem.next_up,
    sem.in_progress,
    sem.review,
    sem.done,
    sem.blocked,
  ];
  if (new Set(targets).size !== targets.length) {
    throw new Error('plan_board_column_policy_duplicate_semantic_target');
  }
  const columnIds = new Set(policy.columns.map((c) => c.id));
  for (const cid of targets) {
    if (!columnIds.has(cid)) {
      throw new Error('plan_board_column_policy_semantic_unknown_column');
    }
  }
  const semanticsToColumnId = { ...sem } as Record<PlanBoardSemanticKey, string>;
  const columnIdToSemantic = new Map<string, PlanBoardSemanticKey>();
  for (const k of PLAN_BOARD_SEMANTIC_KEYS) {
    columnIdToSemantic.set(sem[k], k);
  }
  const columns: ResolvedPlanBoardColumn[] = policy.columns.map((c) => {
    const semantic = columnIdToSemantic.get(c.id) ?? null;
    return {
      id: c.id,
      title: c.title,
      semantic,
      visible_to_client: semantic != null && PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS.has(semantic),
    };
  });
  const clientVisibleColumnIds = new Set(
    PLAN_BOARD_SEMANTIC_KEYS.filter((s) => PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS.has(s)).map((s) => semanticsToColumnId[s]),
  );
  return {
    schema_version: PLAN_BOARD_COLUMN_POLICY_LIMITS.schemaVersion,
    columns,
    allowedColumnIds: policy.columns.map((c) => c.id),
    semanticsToColumnId,
    landingPackCardColumnId: sem.backlog,
    clientVisibleColumnIds,
    defaultDeliveryAreaForColumnId(columnId: string): 'backlog' | 'board' {
      return columnId === sem.backlog ? 'backlog' : 'board';
    },
  };
}

export function tryParsePlanBoardColumnPolicyPut(raw: unknown): PlanBoardColumnPolicyPut | null {
  const parsed = PlanBoardColumnPolicyPutSchema.safeParse(raw);
  if (!parsed.success) return null;
  try {
    toResolved(parsed.data);
  } catch {
    return null;
  }
  return parsed.data;
}

export function resolvePlanBoardPolicyFromSources(args: {
  featureEnabled: boolean;
  ownerProfileEntitled: boolean;
  persistedPolicy: unknown | null;
}): ResolvedPlanBoardPolicy {
  if (!args.featureEnabled || !args.ownerProfileEntitled || args.persistedPolicy == null) {
    return buildDefaultResolvedPlanBoardPolicy();
  }
  const valid = tryParsePlanBoardColumnPolicyPut(args.persistedPolicy);
  if (!valid) return buildDefaultResolvedPlanBoardPolicy();
  return toResolved(valid);
}

export async function fetchPlanBoardOwnerEntitled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan_board_custom_columns_entitled')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as { plan_board_custom_columns_entitled?: boolean }).plan_board_custom_columns_entitled === true;
}

export async function fetchAuditPlanBoardPolicyFields(auditId: string): Promise<{
  user_id: string | null;
  plan_board_column_policy: unknown | null;
} | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('user_id, plan_board_column_policy')
    .eq('id', auditId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    user_id: (data as { user_id?: string | null }).user_id ?? null,
    plan_board_column_policy: (data as { plan_board_column_policy?: unknown | null }).plan_board_column_policy ?? null,
  };
}

export async function resolvePlanBoardPolicyForAuditId(args: {
  auditId: string;
  featureEnabled: boolean;
}): Promise<{
  resolved: ResolvedPlanBoardPolicy;
  ownerUserId: string | null;
  ownerPlanBoardCustomColumnsEntitled: boolean;
} | null> {
  const row = await fetchAuditPlanBoardPolicyFields(args.auditId);
  if (!row?.user_id) return null;
  const entitled = await fetchPlanBoardOwnerEntitled(row.user_id);
  const resolved = resolvePlanBoardPolicyFromSources({
    featureEnabled: args.featureEnabled,
    ownerProfileEntitled: entitled,
    persistedPolicy: row.plan_board_column_policy,
  });
  return {
    resolved,
    ownerUserId: row.user_id,
    ownerPlanBoardCustomColumnsEntitled: entitled,
  };
}

export function semanticForColumnId(
  resolved: ResolvedPlanBoardPolicy,
  columnId: string,
): PlanBoardSemanticKey | null {
  const hit = resolved.columns.find((c) => c.id === columnId);
  return hit?.semantic ?? null;
}

export function buildResolvedPlanBoardPolicyFromPut(policy: PlanBoardColumnPolicyPut): ResolvedPlanBoardPolicy {
  return toResolved(policy);
}

export async function remapAllPlanBoardCardsForPolicyChange(args: {
  auditId: string;
  oldResolved: ResolvedPlanBoardPolicy;
  newResolved: ResolvedPlanBoardPolicy;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows, error } = await supabase
    .from('plan_task_delivery')
    .select('id, column_id')
    .eq('audit_id', args.auditId);
  if (error) return { ok: false, error: error.message };

  for (const row of rows ?? []) {
    const newCol = remapPlanBoardCardColumnIdBetweenPolicies({
      oldResolved: args.oldResolved,
      newResolved: args.newResolved,
      columnId: row.column_id as string,
    });
    const newArea = args.newResolved.defaultDeliveryAreaForColumnId(newCol);
    const { error: upErr } = await supabase
      .from('plan_task_delivery')
      .update({
        column_id: newCol,
        delivery_area: newArea,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id as string);
    if (upErr) return { ok: false, error: upErr.message };
  }
  return { ok: true };
}
