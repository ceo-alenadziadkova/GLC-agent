import { isCausalDagEnabled } from '../../../config/feature-flags.js';
import { isStrictlyBeforePhase, isKnownPhaseId } from '../../../config/phase-order.js';
import { logger } from '../../logger.js';
import {
  CONTROL_OBJECT_VERSIONS_CAUSAL_DAG,
  type ControlObjectCausalChainEntry,
  type ControlObjectCausalClaimRef,
  type ControlObjectV1,
  type PhaseId,
} from '../../../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';

function dedupeCausalRefs(refs: ControlObjectCausalClaimRef[]): ControlObjectCausalClaimRef[] {
  const seen = new Set<string>();
  const out: ControlObjectCausalClaimRef[] = [];
  for (const r of refs) {
    const k = `${r.phase_id}:${r.claim_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function maybeBuildCausalDag(params: {
  co: ControlObjectV1;
  auditId: string;
  domainKey: DomainKey;
  issues: DomainResult['issues'];
  priorControlObjects: Partial<Record<PhaseId, ControlObjectV1>>;
}): void {
  const { co, auditId, domainKey, issues, priorControlObjects } = params;

  // ─── v2.3: Causal chain (FEATURE_CAUSAL_DAG) ─────────────────
  if (!isCausalDagEnabled()) return;

  const chain: ControlObjectCausalChainEntry[] = [];
  const currentPhase = domainKey as PhaseId;

  for (let issueIdx = 0; issueIdx < issues.length; issueIdx++) {
    const issue = issues[issueIdx];
    const rawRefs = issue.premise_refs ?? [];
    const validRefs: ControlObjectCausalClaimRef[] = [];

    for (const raw of rawRefs) {
      if (!isKnownPhaseId(raw.phase_id)) {
        logger.warn('fact_checker.causal_unknown_phase', {
          component: 'fact_checker',
          audit_id: auditId,
          phase_id: domainKey,
          premise_phase_id: raw.phase_id,
        });
        continue;
      }

      const premisePhase = raw.phase_id;
      if (!isStrictlyBeforePhase(premisePhase, currentPhase)) {
        logger.warn('fact_checker.causal_phase_order_violation', {
          component: 'fact_checker',
          audit_id: auditId,
          phase_id: domainKey,
          premise_phase_id: premisePhase,
        });
        continue;
      }

      const prior = priorControlObjects[premisePhase];
      const sources = prior?.trace?.claim_sources ?? [];
      const maxId = sources.length > 0 ? Math.max(...sources.map(c => c.claim_id)) : 0;

      if (raw.claim_id < 1 || raw.claim_id > maxId) {
        logger.warn('fact_checker.causal_claim_out_of_range', {
          component: 'fact_checker',
          audit_id: auditId,
          phase_id: domainKey,
          premise_phase_id: premisePhase,
          claim_id: raw.claim_id,
          max_claim_id: maxId,
        });
        continue;
      }

      validRefs.push({ phase_id: premisePhase, claim_id: raw.claim_id });
    }

    const deduped = dedupeCausalRefs(validRefs);
    if (deduped.length > 0) {
      chain.push({ claim_id: issueIdx + 1, depends_on: deduped });
    }
  }

  co.trace.causal_chain = chain;
  co.versions = {
    ...co.versions,
    system_version: CONTROL_OBJECT_VERSIONS_CAUSAL_DAG.system_version,
    fact_checker_version: CONTROL_OBJECT_VERSIONS_CAUSAL_DAG.fact_checker_version,
  };
}

