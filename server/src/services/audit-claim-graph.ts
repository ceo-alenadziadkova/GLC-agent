/**
 * Persists and traverses cross-phase claim dependencies (Phase 8 causal DAG).
 * CO-CONSUMER: update when CONTROL_OBJECT causal types or audit_claim_graph DDL change.
 */

import type { ControlObjectCausalChainEntry, ControlObjectCausalClaimRef } from '../schemas/control-object.js';
import type { DomainKey } from '../types/audit.js';
import { collectTransitiveDependents } from '../lib/audit-claim-graph-bfs.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';

export { collectTransitiveDependents } from '../lib/audit-claim-graph-bfs.js';

export type AuditClaimGraphRow = import('../lib/audit-claim-graph-bfs.js').AuditClaimGraphRowShape;

/**
 * Upserts one row per issue claim (1..issueClaimCount) for this phase.
 * Claims without causal_chain entries get depends_on_refs = [].
 */
export async function upsertClaimGraphRows(
  auditId: string,
  phaseId: DomainKey,
  chain: ControlObjectCausalChainEntry[],
  issueClaimCount: number
): Promise<void> {
  if (issueClaimCount < 1) return;

  const deps = new Map<number, ControlObjectCausalClaimRef[]>();
  for (const e of chain) {
    deps.set(e.claim_id, e.depends_on);
  }

  const now = new Date().toISOString();
  const rows = [];
  for (let c = 1; c <= issueClaimCount; c++) {
    const depends_on_refs = deps.get(c) ?? [];
    rows.push({
      audit_id: auditId,
      phase_id: phaseId,
      claim_id: c,
      depends_on_refs,
      status: 'active',
      updated_at: now,
    });
  }

  const { error } = await supabase.from('audit_claim_graph').upsert(rows, {
    onConflict: 'audit_id,phase_id,claim_id',
  });

  if (error) {
    logger.warn('audit_claim_graph.upsert_failed', {
      component: 'audit_claim_graph',
      audit_id: auditId,
      phase_id: phaseId,
      error: error.message,
    });
  }
}

/** Claim ids in this phase whose graph row is marked invalidated. */
export async function fetchInvalidatedClaimIdsForPhase(
  auditId: string,
  phaseId: DomainKey
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('audit_claim_graph')
    .select('claim_id')
    .eq('audit_id', auditId)
    .eq('phase_id', phaseId)
    .eq('status', 'invalidated');

  if (error || !data) {
    if (error) {
      logger.warn('audit_claim_graph.fetch_invalidated_failed', {
        component: 'audit_claim_graph',
        audit_id: auditId,
        phase_id: phaseId,
        error: error.message,
      });
    }
    return new Set();
  }

  return new Set(data.map(r => r.claim_id));
}

/**
 * Marks every claim that transitively depends on any seed ref as invalidated.
 * Does not mark seed rows themselves.
 */
export async function invalidateDownstreamDependents(
  auditId: string,
  seedRefs: ControlObjectCausalClaimRef[]
): Promise<{ marked: ControlObjectCausalClaimRef[] }> {
  if (seedRefs.length === 0) return { marked: [] };

  const { data: allRows, error } = await supabase
    .from('audit_claim_graph')
    .select('phase_id, claim_id, depends_on_refs, status')
    .eq('audit_id', auditId);

  if (error || !allRows) {
    logger.warn('audit_claim_graph.invalidate_fetch_failed', {
      component: 'audit_claim_graph',
      audit_id: auditId,
      error: error?.message,
    });
    return { marked: [] };
  }

  const rows = allRows as AuditClaimGraphRow[];
  const marked = collectTransitiveDependents(rows, seedRefs);

  const now = new Date().toISOString();
  for (const m of marked) {
    const { error: upErr } = await supabase
      .from('audit_claim_graph')
      .update({ status: 'invalidated', updated_at: now })
      .eq('audit_id', auditId)
      .eq('phase_id', m.phase_id)
      .eq('claim_id', m.claim_id);

    if (upErr) {
      logger.warn('audit_claim_graph.invalidate_update_failed', {
        component: 'audit_claim_graph',
        audit_id: auditId,
        phase_id: m.phase_id,
        claim_id: m.claim_id,
        error: upErr.message,
      });
    }
  }

  return { marked };
}
