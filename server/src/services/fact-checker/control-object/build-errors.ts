import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import { DOMAIN_STRUCTURAL_HEURISTICS } from '../../../config/fact-checker/domain-structural-heuristics.js';
import {
  FIXABLE_ERROR_RISKY_PROMISE_LANGUAGE,
  FIXABLE_ERROR_SCORE_CONSISTENCY_FLAG,
  HUMAN_ATTENTION_UPSTREAM_CLAIM_INVALIDATED,
  STRUCTURAL_ERROR_SCORE_EVIDENCE_MISMATCH,
  STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED,
} from '../../../config/fact-checker/control-object-error-codes.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { ExtendedPhaseProfile } from '../../../config/phase-profiles.js';
import type { FactCorrection } from '../types.js';

export function buildErrors(params: {
  co: ControlObjectV1;
  result: DomainResult;
  corrections: FactCorrection[];
  domainKey: DomainKey;
  profile: ExtendedPhaseProfile;
  invalidatedIssueClaimIds: ReadonlySet<number>;
}): void {
  const { co, result, corrections, domainKey, profile, invalidatedIssueClaimIds } = params;

  const issues = result.issues ?? [];
  const coh = FACT_CHECKER_THRESHOLDS.controlObjectHeuristics;

  const unknownMax = coh.unknownItemKeyMaxChars;
  const unknownEllipsis = coh.unknownItemKeyTruncationEllipsis;

  // ─── Errors ───────────────────────────────────────────────
  // data_gaps from unknown_items
  for (const item of result.unknown_items ?? []) {
    const key =
      item.length > unknownMax
        ? item.slice(0, unknownMax - unknownEllipsis.length) + unknownEllipsis
        : item;
    co.errors.data_gaps.push(key);
  }

  // structural: score-severity mismatches (derived from corrections)
  if (corrections.some(c => c.field === 'score' && c.action === 'override')) {
    co.errors.structural.push(STRUCTURAL_ERROR_SCORE_EVIDENCE_MISMATCH);
  }

  // v1.5: domain-specific structural errors from phase profile
  // If any correction's issue text matches a known error_type pattern, surface it
  for (const errorType of profile.error_types) {
    const keyword = errorType.replace(/_/g, ' ');
    const matchesCorrection = corrections.some(
      c => c.issue.toLowerCase().includes(keyword) || c.raw_evidence.toLowerCase().includes(keyword),
    );
    if (matchesCorrection && !co.errors.structural.includes(errorType)) {
      co.errors.structural.push(errorType);
    }
  }

  const domainHeuristicMappings = DOMAIN_STRUCTURAL_HEURISTICS[domainKey];
  if (domainHeuristicMappings) {
    for (const map of domainHeuristicMappings) {
      const hit = corrections.some(
        c => c.issue.toLowerCase().includes(map.needle) || c.raw_evidence.toLowerCase().includes(map.needle),
      );
      if (hit && !co.errors.structural.includes(map.code)) {
        co.errors.structural.push(map.code);
      }
    }
  }

  // v2.3: upstream invalidated claims (audit_claim_graph)
  for (let invIdx = 0; invIdx < issues.length; invIdx++) {
    if (!invalidatedIssueClaimIds.has(invIdx + 1)) continue;
    if (!co.errors.structural.includes(STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED)) {
      co.errors.structural.push(STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED);
    }
    co.human_attention_required.required = true;
    if (!co.human_attention_required.reasons.includes(HUMAN_ATTENTION_UPSTREAM_CLAIM_INVALIDATED)) {
      co.human_attention_required.reasons.push(HUMAN_ATTENTION_UPSTREAM_CLAIM_INVALIDATED);
    }
  }

  // fixable: flag-type corrections that are tone/wording issues
  if (corrections.some(c => c.action === 'flag')) {
    co.errors.fixable.push(FIXABLE_ERROR_SCORE_CONSISTENCY_FLAG);
  }

  // fixable: risky promise language
  if (co.counts.statuses.risky_promise > 0) {
    co.errors.fixable.push(FIXABLE_ERROR_RISKY_PROMISE_LANGUAGE);
  }

  const strategicPattern = new RegExp(coh.strategicInconsistencyStructuralCodePattern, 'i');
  co.counts.statuses.strategic_inconsistency = co.errors.structural.filter(e => strategicPattern.test(e)).length;
}

