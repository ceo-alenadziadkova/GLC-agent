import { createControlObjectV1 } from '../../fact-checker/control-object/factory/create-control-object.js';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { ExecutionMode } from '../../../schemas/control-object/primitives.js';
import { PIPELINE_MAX_PHASE_INDEX } from '../../../config/pipeline-phases.js';
import type { StrategyOutput } from '../../../schemas/domain-output.js';
import { PHASE_DOMAIN_MAP } from '../../../types/audit.js';

export type StrategyNarrowControlObjectInput = {
  auditId: string;
  executionMode: ExecutionMode;
  riskProfile: 'low' | 'medium' | 'high' | 'enterprise' | null;
  strategyResult: StrategyOutput;
  weightedOverallScore: number;
  completedDomainCount: number;
};

/**
 * Phase A narrow governance for strategy: no claim graph; signals for DecisionLayer.decideNarrow.
 */
export function buildStrategyNarrowControlObject(input: StrategyNarrowControlObjectInput): ControlObjectV1 {
  const strategyPhaseId = PHASE_DOMAIN_MAP[PIPELINE_MAX_PHASE_INDEX];
  const co = createControlObjectV1(input.auditId, strategyPhaseId, input.executionMode, null);
  co.context.governance_profile = 'narrow';
  co.context.risk_profile = input.riskProfile;

  const structural: string[] = [];
  const dataGaps: string[] = [];
  const reasons: string[] = [];

  const narrow = SYSTEM_DEFAULTS.strategyNarrowGovernance;
  const codes = narrow.errorCodes;
  const confPen = narrow.confidence;

  const deltaThreshold = narrow.maxModelVsWeightedScoreDelta;
  const modelOverall = input.strategyResult.overall_score;
  const weighted = input.weightedOverallScore;

  if (
    typeof modelOverall === 'number' &&
    Number.isFinite(modelOverall) &&
    typeof weighted === 'number' &&
    Number.isFinite(weighted) &&
    Math.abs(modelOverall - weighted) > deltaThreshold
  ) {
    structural.push(codes.modelVsWeightedScoreMismatch);
  }

  if (input.completedDomainCount === 0) {
    dataGaps.push(codes.noCompletedDomainScores);
    reasons.push(codes.noCompletedDomainScores);
  }

  co.errors = {
    fixable: [],
    structural: [...structural],
    data_gaps: [...dataGaps],
  };

  let overall = confPen.baselineOverall;
  overall -= structural.length * confPen.penaltyPointsPerStructural;
  overall -= dataGaps.length * confPen.penaltyPointsPerDataGap;
  co.confidence = {
    ...co.confidence,
    overall: Math.max(
      confPen.overallClampMin,
      Math.min(confPen.overallClampMax, Math.round(overall)),
    ),
  };

  const invariantOk =
    typeof co.confidence.overall === 'number' &&
    Number.isFinite(co.confidence.overall) &&
    co.context.phase_id === PHASE_DOMAIN_MAP[PIPELINE_MAX_PHASE_INDEX] &&
    co.context.audit_id === input.auditId;

  if (!invariantOk) {
    co.errors.structural.push(codes.governanceIncomplete);
    co.confidence.overall = Math.min(co.confidence.overall, confPen.invariantFailureMaxOverall);
  }

  co.human_attention_required = {
    required: reasons.length > 0 || structural.length > 0,
    reasons: reasons.length > 0 ? [...reasons] : structural.length > 0 ? [...structural] : [],
    requirements_met: null,
  };

  co.trace = {
    claim_sources: [],
    causal_chain: [],
  };

  return co;
}
