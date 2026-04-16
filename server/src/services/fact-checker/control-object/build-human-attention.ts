import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import {
  HUMAN_ATTENTION_CRITICAL_DATA_GAPS,
  HUMAN_ATTENTION_CRITICALLY_LOW_FEASIBILITY,
  HUMAN_ATTENTION_EXTERNAL_SOURCE_UNAVAILABLE,
  HUMAN_ATTENTION_HIGH_HALLUCINATION_COUNT,
  HUMAN_ATTENTION_HIGH_RISK_ASSUMPTIONS,
} from '../../../config/fact-checker/control-object-error-codes.js';
import type { ControlObjectV1 } from '../../../schemas/control-object.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { ExtendedPhaseProfile } from '../../../config/phase-profiles.js';
import type { ConnectorRunResult } from '../../connector-runner.js';
import type { FeasibilityResult } from '../../feasibility-layer.js';

export function buildHumanAttention(params: {
  co: ControlObjectV1;
  issues: DomainResult['issues'];
  connectorEnrichments: ConnectorRunResult[];
  profile: ExtendedPhaseProfile;
  domainKey: DomainKey;
  feasibilityResult: FeasibilityResult;
}): void {
  const { co, issues, connectorEnrichments, profile, feasibilityResult } = params;

  // ─── Human Attention ──────────────────────────────────────
  const coh = FACT_CHECKER_THRESHOLDS.controlObjectHeuristics;
  const dataGapCount = co.errors.data_gaps.length;

  // v1.5: count only high-risk assumptions (not all) — low/medium are advisory only
  const highRiskAssumptionCount = co.assumptions.filter(a => a.risk === 'high').length;

  // also escalate if many medium-risk assumptions accumulate
  const mediumRiskAssumptionCount = co.assumptions.filter(a => a.risk === 'medium').length;

  const ha = coh.humanAttention;
  const assumptionsEscalate =
    highRiskAssumptionCount >= ha.highRiskAssumptionsGte || mediumRiskAssumptionCount >= ha.mediumRiskAssumptionsGte;

  // v1.7: critically low feasibility also requires human attention
  const feasibilityTooLow = feasibilityResult.score <= ha.feasibilityScoreMaxInclusive;

  if (
    co.counts.statuses.likely_hallucination >= ha.minLikelyHallucination ||
    dataGapCount >= ha.minDataGaps ||
    assumptionsEscalate ||
    feasibilityTooLow
  ) {
    co.human_attention_required.required = true;

    if (co.counts.statuses.likely_hallucination >= ha.minLikelyHallucination) {
      co.human_attention_required.reasons.push(HUMAN_ATTENTION_HIGH_HALLUCINATION_COUNT);
    }
    if (dataGapCount >= ha.minDataGaps) {
      co.human_attention_required.reasons.push(HUMAN_ATTENTION_CRITICAL_DATA_GAPS);
    }
    if (assumptionsEscalate) {
      co.human_attention_required.reasons.push(HUMAN_ATTENTION_HIGH_RISK_ASSUMPTIONS);
    }
    if (feasibilityTooLow) {
      co.human_attention_required.reasons.push(HUMAN_ATTENTION_CRITICALLY_LOW_FEASIBILITY);
    }
  }

  // ─── v2.2: External source unavailability flag ────────────
  // If connectors were registered and ALL applicable connectors failed/timed out,
  // AND the phase has high-risk claims, flag for human attention.
  // Condition: ≥1 connector ran, none succeeded (all timed_out or error), AND
  //            at least one issue is of a high-risk fact type.
  if (connectorEnrichments.length > 0) {
    const allConnectorsFailed = connectorEnrichments.every(r => r.timed_out || r.error !== null);

    const highRiskTypes = new Set(profile.high_risk_fact_types);
    const hasHighRiskIssue = issues.some(issue =>
      [...highRiskTypes].some(ft => issue.title.toLowerCase().includes(ft.replace(/_/g, ' '))),
    );

    if (allConnectorsFailed && hasHighRiskIssue) {
      co.human_attention_required.required = true;
      if (!co.human_attention_required.reasons.includes(HUMAN_ATTENTION_EXTERNAL_SOURCE_UNAVAILABLE)) {
        co.human_attention_required.reasons.push(HUMAN_ATTENTION_EXTERNAL_SOURCE_UNAVAILABLE);
      }
    }
  }
}

