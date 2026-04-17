import {FACT_CHECKER_THRESHOLDS} from '../config/fact-checker-thresholds.js';
import {factCheckerCopy, interpolateFactCheckerMessage} from '../config/fact-checker-copy.js';
import type {DomainResult, DomainKey, ConfidenceLevel} from '../types/audit.js';
import {
    createControlObjectV1,
    type ControlObjectV1,
    type PhaseId,
    type ExecutionMode,
} from '../schemas/control-object/index.js';
import {getExtendedPhaseProfile} from '../config/phase-profiles.js';
import type {ConnectorRunResult} from './connector-runner.js';
import {verifyKernel} from './fact-checker/verify/verify-kernel.js';
import {buildCountsAndStatuses} from './fact-checker/control-object/build-counts-statuses.js';
import {buildErrors} from './fact-checker/control-object/build-errors.js';
import {buildAssumptions} from './fact-checker/control-object/build-assumptions.js';
import {buildTrace} from './fact-checker/control-object/build-trace.js';
import {buildFeasibilityAndConfidence} from './fact-checker/control-object/build-feasibility-confidence.js';
import {buildHumanAttention} from './fact-checker/control-object/build-human-attention.js';
import {finalizeExecutionAndPerformance} from './fact-checker/control-object/finalize-execution-performance.js';
import {maybeBuildCausalDag} from './fact-checker/control-object/causal-dag.js';
import type {BriefSnapshot} from './feasibility-layer.js';

const T = FACT_CHECKER_THRESHOLDS;

/** Optional governance fields populated from audit row + pipeline (CONTROL_OBJECT v2.1+). */
export interface BuildControlObjectGovernanceInput {
    riskProfile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
    /** Bandit-selected variant id, including `default` when exploration uses the baseline arm. */
    selectedVariantId?: string;
}

export interface FactCheckResult {
    result: DomainResult;
    corrections: FactCorrection[];
    /** 0–1 overall confidence in the score, derived from corrections + finding confidences. */
    confidence: number;
}

export interface FactCorrection {
    field: string;
    issue: string;
    raw_evidence: string;
    action: 'flag' | 'override';
    original_value?: unknown;
    corrected_value?: unknown;
}

/**
 * Validates Claude's analysis against raw collected data.
 * Catches hallucinations and score inconsistencies.
 */
export class FactChecker {
    verify(
        result: DomainResult,
        domainKey: DomainKey,
        collectedData: Record<string, Record<string, unknown>>
    ): FactCheckResult {
        return verifyKernel({result, domainKey, collectedData});
    }

    /**
     * Builds CONTROL_OBJECT v1 from a completed FactCheckResult.
     *
     * Call this AFTER verify() to produce the governance contract.
     * Non-breaking: verify() signature and return value are unchanged.
     *
     * Claim extraction approach (v1 light):
     *  - Each AuditIssue   → 1 FACT claim (high-risk if critical/high severity)
     *  - Recommendations   → counted as STRATEGIC_HYPOTHESIS
     *  - Strengths/weaknesses → counted as OPINION
     *  - unknown_items     → data_gaps errors
     *
     * Status assignment:
     *  - override correction → likely_hallucination
     *  - flag correction     → unverified
     *  - data_source='from_brief' issues → confirmed_brief
     *  - risky language detected → risky_promise
     */
    buildControlObject(
        factCheckResult: FactCheckResult,
        domainKey: DomainKey,
        auditId: string,
        phaseNumber: number,
        executionMode: ExecutionMode = 'normal',
        /** v1.7+: brief snapshot for feasibility assessment. Pass {} or omit for phases without brief context. */
        brief: BriefSnapshot = {},
        governance: BuildControlObjectGovernanceInput = {},
        /**
         * v2.2+: Phase 7 external connector enrichments (from ConnectorRunner.runAll()).
         * Pass [] or omit when no connectors ran (zero-cost — skips enrichment logic entirely).
         *
         * Effects on CONTROL_OBJECT:
         *   - Claims whose issue type matches a confirmed fact type get truth_source elevated to 'external_api'.
         *   - If all applicable connectors timed out / errored AND the phase has high-risk claims,
         *     adds 'external_source_unavailable' to human_attention_required.reasons.
         */
        connectorEnrichments: ConnectorRunResult[] = [],
        /**
         * v2.3+: Latest CONTROL_OBJECT per upstream phase (Phase 8 causal DAG).
         * Used to validate premise_refs against prior trace.claim_sources.
         */
        priorControlObjects: Partial<Record<PhaseId, ControlObjectV1>> = {},
        /** Claim indices (1-based) pre-flagged as invalidated in audit_claim_graph for this phase. */
        invalidatedIssueClaimIds: ReadonlySet<number> = new Set(),
    ): ControlObjectV1 {
        const {result, corrections, confidence: factualRaw} = factCheckResult;

        // Extended phase profile: truth profile id, error types, confidence_weights (ADR-PHASE-PROFILES)
        const profile = getExtendedPhaseProfile(domainKey);
        const truthProfileId = profile.phase_id;

        const co = createControlObjectV1(auditId, domainKey as PhaseId, executionMode, truthProfileId);

        if (governance.riskProfile !== undefined) {
            co.context.risk_profile = governance.riskProfile;
        }
        if (governance.selectedVariantId !== undefined) {
            co.context.selected_variant_id = governance.selectedVariantId;
        }

        // ─── Counts / Statuses / Errors / Assumptions / Trace ────────────────
        const issues = result.issues ?? [];

        buildCountsAndStatuses({co, result, corrections});
        buildErrors({co, result, corrections, domainKey, profile, invalidatedIssueClaimIds});
        buildAssumptions({co, result, profile});
        buildTrace({co, issues, domainKey, phaseNumber, connectorEnrichments});

        // ─── v2.3: Causal chain (FEATURE_CAUSAL_DAG) ─────────────────
        maybeBuildCausalDag({
            co,
            auditId,
            domainKey,
            issues,
            priorControlObjects,
        });

        // ─── Feasibility + Confidence ─────────────────────────────────
        const feasibilityResult = buildFeasibilityAndConfidence({
            co,
            domainKey,
            result,
            brief,
            profile,
            factualRaw,
        });

        // ─── Human Attention (incl. external source unavailability) ───
        buildHumanAttention({
            co,
            issues,
            connectorEnrichments,
            profile,
            domainKey,
            feasibilityResult,
        });

        // ─── Safety Mode + Performance + Structural Seeds ─────────────
        finalizeExecutionAndPerformance({
            co,
            phaseNumber,
            corrections,
            issues,
        });

        return co;
    }
}
