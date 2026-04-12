/**
 * Canonical ordering of pipeline phases for causal DAG validation.
 * A claim may only depend on claims from phases with a strictly lower index.
 *
 * See docs/adrs/ADR-CAUSAL-DAG.md (cycle prevention).
 */

import type { PhaseId } from '../schemas/control-object.js';

const PHASE_ORDER_INDEX: Record<string, number> = {
  recon: 0,
  tech_infrastructure: 1,
  security_compliance: 2,
  seo_digital: 3,
  ux_conversion: 4,
  marketing_utp: 5,
  automation_processes: 6,
  strategy: 7,
};

export function phaseOrderIndex(phaseId: string): number | undefined {
  return PHASE_ORDER_INDEX[phaseId];
}

/** True if phase `a` is strictly earlier in the pipeline than phase `b`. */
export function isStrictlyBeforePhase(a: PhaseId, b: PhaseId): boolean {
  const ia = PHASE_ORDER_INDEX[a];
  const ib = PHASE_ORDER_INDEX[b];
  if (ia === undefined || ib === undefined) return false;
  return ia < ib;
}

const KNOWN_PHASE_IDS = new Set(Object.keys(PHASE_ORDER_INDEX));

export function isKnownPhaseId(id: string): id is PhaseId {
  return KNOWN_PHASE_IDS.has(id);
}

/** Phase ids that run strictly before the given domain phase (for prior CONTROL_OBJECT loading). */
export function phaseIdsStrictlyBefore(domainKey: string): PhaseId[] {
  const currentIdx = phaseOrderIndex(domainKey);
  if (currentIdx === undefined) return [];
  return (Object.keys(PHASE_ORDER_INDEX) as PhaseId[]).filter(
    p => (phaseOrderIndex(p) ?? 999) < currentIdx,
  );
}
