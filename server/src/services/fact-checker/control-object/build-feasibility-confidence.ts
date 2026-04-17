import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import { computeWeightedConfidence } from '../../../config/phase-confidence-weights.js';
import { feasibilityLayer, type BriefSnapshot, type FeasibilityResult } from '../../feasibility-layer.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { ExtendedPhaseProfile } from '../../../config/phase-profiles.js';

export function buildFeasibilityAndConfidence(params: {
  co: ControlObjectV1;
  domainKey: DomainKey;
  result: DomainResult;
  brief: BriefSnapshot;
  profile: ExtendedPhaseProfile;
  factualRaw: number;
}): FeasibilityResult {
  const { co, domainKey, result, brief, profile, factualRaw } = params;

  // ─── Feasibility (v1.7) ───────────────────────────────────
  const feasibilityResult = feasibilityLayer.assess(domainKey, result, brief);
  co.feasibility = {
    score: feasibilityResult.score,
    risk_codes: feasibilityResult.risks.map(r => r.code),
    notes: feasibilityResult.notes,
  };

  // ─── Confidence (v1.7: weighted per-phase formula) ────────
  // factual: from FactChecker.calculateConfidence() (converted 0–1 → 0–100)
  const factual = Math.round(factualRaw * 100);

  // strategic: degrade if many unverified recs or risky promises
  const factCount = co.counts.fact;
  const hypothesisCount = co.counts.strategic_hypothesis;
  const riskyRatio = factCount > 0 ? co.counts.statuses.risky_promise / Math.max(hypothesisCount, 1) : 0;
  const unverifiedRatio = factCount > 0 ? co.counts.statuses.unverified / factCount : 0;

  const coh = FACT_CHECKER_THRESHOLDS.controlObjectHeuristics;
  const sc = coh.strategicConfidence;
  const strategic = Math.max(
    0,
    Math.round(100 - (riskyRatio * sc.riskyPromiseMultiplier) - (unverifiedRatio * sc.unverifiedMultiplier)),
  );

  // consistency: degrade if structural errors present
  const cc = coh.consistencyConfidence;
  const structuralPenalty = co.errors.structural.length * cc.structuralErrorMultiplier;
  const hallucinationPenalty = co.counts.statuses.likely_hallucination * cc.hallucinationMultiplier;
  const consistency = Math.max(0, 100 - structuralPenalty - hallucinationPenalty);

  // feasibility: score × 100
  const feasibilityScore = Math.round(feasibilityResult.score * 100);

  // overall: phase-specific weighted formula (replaces simple average from v1.5)
  const weights = profile.confidence_weights;
  const overall = computeWeightedConfidence(factual, strategic, consistency, feasibilityScore, weights);

  co.confidence = { overall, factual, strategic, consistency, feasibility: feasibilityScore };
  co.confidence_weights = weights;

  return feasibilityResult;
}

