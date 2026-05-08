import { POSTGRES_UNDEFINED_TABLE_CODE } from '../../config/postgrest-codes.js';
import { supabase } from '../supabase.js';
import { logger } from '../logger.js';

const COALITION_CAUSAL_SNAPSHOT_SCHEMA_VERSION = 1 as const;

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
}

function hypothesisIdsFromDraft(draft: unknown): string[] {
  if (!draft || typeof draft !== 'object') return [];
  return asRecords((draft as { hypotheses?: unknown }).hypotheses)
    .map(item => item.id)
    .filter((id): id is string => typeof id === 'string');
}

export async function persistCoalitionCausalSnapshot(auditId: string): Promise<void> {
  const [{ data: drafts }, { data: alignments }, { data: resolutionRow }] = await Promise.all([
    supabase.from('audit_domain_hypotheses').select('domain_key, draft').eq('audit_id', auditId),
    supabase.from('audit_domain_alignments').select('domain_key, alignment').eq('audit_id', auditId),
    supabase.from('audit_conflict_resolutions').select('resolution').eq('audit_id', auditId).single(),
  ]);

  const hypothesisNodes = ((drafts as Array<{ domain_key: string; draft: unknown }> | null) ?? []).flatMap(row =>
    hypothesisIdsFromDraft(row.draft).map(id => ({ id, domain_key: row.domain_key, type: 'hypothesis' })),
  );
  const alignmentEdges = ((alignments as Array<{ domain_key: string; alignment: unknown }> | null) ?? []).flatMap(row =>
    asRecords((row.alignment as { cross_domain_reactions?: unknown } | null)?.cross_domain_reactions).map(reaction => ({
      from: row.domain_key,
      to: reaction.target_hypothesis_id,
      relation: reaction.relation,
      type: 'alignment_reaction',
    })),
  );
  const resolution = (resolutionRow as { resolution?: unknown } | null)?.resolution as Record<string, unknown> | undefined;
  const conflictNodes = asRecords(resolution?.resolved_conflicts).map(conflict => ({
    id: conflict.id,
    type: 'resolved_conflict',
    parties: conflict.parties,
  }));

  const { error } = await supabase.from('audit_coalition_causal_snapshots').insert({
    audit_id: auditId,
    schema_version: COALITION_CAUSAL_SNAPSHOT_SCHEMA_VERSION,
    snapshot: {
      nodes: [...hypothesisNodes, ...conflictNodes],
      edges: alignmentEdges,
    },
  });

  if (error?.code === POSTGRES_UNDEFINED_TABLE_CODE) {
    logger.warn('coalition.causal_snapshot_table_missing', { component: 'coalition', audit_id: auditId });
    return;
  }
  if (error) throw error;
}
