/**
 * Pure transitive dependent walk for audit_claim_graph rows (no Supabase import).
 */

import type { ControlObjectCausalClaimRef, PhaseId } from '../schemas/control-object.js';

export interface AuditClaimGraphRowShape {
  phase_id: string;
  claim_id: number;
  depends_on_refs: unknown;
  status: string;
}

function refKey(r: ControlObjectCausalClaimRef): string {
  return `${r.phase_id}:${r.claim_id}`;
}

function dependsOnContainsRef(dependsOnRefs: unknown, target: ControlObjectCausalClaimRef): boolean {
  if (!Array.isArray(dependsOnRefs)) return false;
  return dependsOnRefs.some(
    (x: unknown) =>
      typeof x === 'object' &&
      x !== null &&
      (x as { phase_id: string; claim_id: number }).phase_id === target.phase_id &&
      Number((x as { claim_id: number }).claim_id) === target.claim_id,
  );
}

/**
 * BFS: every active row that transitively depends on any seed ref.
 */
export function collectTransitiveDependents(
  rows: ReadonlyArray<AuditClaimGraphRowShape>,
  seedRefs: ControlObjectCausalClaimRef[],
): ControlObjectCausalClaimRef[] {
  if (seedRefs.length === 0) return [];

  const queue: ControlObjectCausalClaimRef[] = [...seedRefs];
  const marked: ControlObjectCausalClaimRef[] = [];
  const markedSet = new Set<string>();
  const expandedRef = new Set<string>();

  while (queue.length > 0) {
    const ref = queue.shift()!;
    const rk = refKey(ref);
    if (expandedRef.has(rk)) continue;
    expandedRef.add(rk);

    for (const row of rows) {
      if (row.status === 'invalidated') continue;
      if (!dependsOnContainsRef(row.depends_on_refs, ref)) continue;

      const child: ControlObjectCausalClaimRef = {
        phase_id: row.phase_id as PhaseId,
        claim_id: row.claim_id,
      };
      const ck = refKey(child);
      if (markedSet.has(ck)) continue;
      markedSet.add(ck);
      marked.push(child);
      queue.push(child);
    }
  }

  return marked;
}
