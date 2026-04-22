import { SYSTEM_DEFAULTS } from './system-defaults.js';
import {
  ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES,
  type OrchestrationPlanGovernanceRolloutMode,
} from './orchestration-plan-governance-rollout-policy.js';

/**
 * Server feature flags — single facade for product toggles.
 *
 * Today: reads documented ops env vars at call time (tests can stub env between calls).
 * Future: swap implementation to FEATURE_FLAGS_JSON / DB / provider without changing call sites.
 *
 * Do not read these env keys from services directly; import from this module only.
 */

const FF = SYSTEM_DEFAULTS.featureFlags;
const ROLLOUT_MODES = ['shadow', 'internal', 'pilot', 'ga'] as const;
export type FeatureRolloutMode = (typeof ROLLOUT_MODES)[number];

/** Env string → boolean; unknown non-empty values fall back to `defaultValue`. */
function readFeatureFlagEnv(env: string | undefined, defaultValue: boolean): boolean {
  const raw = env?.trim();
  if (!raw) return defaultValue;
  const v = raw.toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return defaultValue;
}

/** Per-phase evaluation_datasets inserts. Env: EVALUATION_DATASETS_INSERT=false to disable. */
export function isEvaluationDatasetsInsertEnabled(): boolean {
  return readFeatureFlagEnv(process.env.EVALUATION_DATASETS_INSERT, FF.evaluationDatasetsInsertEnabled);
}

/**
 * When true, inserts into `evaluation_datasets` require audit owner's `evaluation_internal` consent.
 * Env: EVALUATION_DATASETS_REQUIRE_INTERNAL_CONSENT=true
 */
export function isEvaluationDatasetsExplicitInternalConsentRequired(): boolean {
  return readFeatureFlagEnv(
    process.env.EVALUATION_DATASETS_REQUIRE_INTERNAL_CONSENT,
    FF.evaluationDatasetsRequireExplicitInternalConsent,
  );
}

/** ML bandit variant selection. Env: FEATURE_BANDITS=true */
export function isBanditsEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_BANDITS, FF.banditsEnabled);
}

/** Auto-loop agent rerun on refine. Env: AUTO_LOOP_ENABLED=true */
export function isAutoLoopEnabled(): boolean {
  return readFeatureFlagEnv(process.env.AUTO_LOOP_ENABLED, FF.autoLoopEnabled);
}

/**
 * Deployment profile names allowed for auto-loop (comma-separated product tiers).
 * Env: AUTO_LOOP_ALLOWED_MODES (default sandbox,internal).
 * Compared against `getAutoLoopExecutionProfile()` — not raw `NODE_ENV`.
 */
export function getAutoLoopAllowedModes(): string[] {
  return (
    process.env.AUTO_LOOP_ALLOWED_MODES
    ?? SYSTEM_DEFAULTS.autoLoop.allowedModesDefault.join(',')
  )
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Profile used to gate auto-loop (infrastructure). Prefer explicit
 * `GLC_DEPLOYMENT_PROFILE` over overloading `NODE_ENV`.
 *
 * - If `GLC_DEPLOYMENT_PROFILE` is set, that value is used.
 * - Legacy: when unset, `NODE_ENV` is used only when it appears in `AUTO_LOOP_ALLOWED_MODES`
 *   (non-standard installs that set NODE_ENV to e.g. `sandbox`).
 */
export function getAutoLoopExecutionProfile(): string | undefined {
  const explicit = process.env.GLC_DEPLOYMENT_PROFILE?.trim();
  if (explicit) return explicit;
  const allowed = getAutoLoopAllowedModes();
  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv && allowed.includes(nodeEnv)) return nodeEnv;
  return undefined;
}

/** Public security.txt connector for security_compliance. Env: CONNECTOR_SECURITY_TXT_ENABLED=false to disable. */
export function isSecurityTxtConnectorEnabled(): boolean {
  return readFeatureFlagEnv(process.env.CONNECTOR_SECURITY_TXT_ENABLED, FF.securityTxtConnectorEnabled);
}

/** Cross-phase causal DAG (audit_claim_graph, trace.causal_chain). Env: FEATURE_CAUSAL_DAG=true */
export function isCausalDagEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_CAUSAL_DAG, FF.causalDagEnabled);
}

/** Auto-remediation of fixable tone issues on cleaned domain output. Env: FEATURE_AUTO_REMEDIATION=true */
export function isAutoRemediationEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_AUTO_REMEDIATION, FF.autoRemediationEnabled);
}

/** Domain benchmarks: API reads, pipeline attaches benchmark_reference_id, recompute endpoints. Env: FEATURE_BENCHMARKS=true */
export function isBenchmarksEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_BENCHMARKS, FF.benchmarksEnabled);
}

/** Strategy Lab on-demand execution pack (extra Claude call). Env: FEATURE_STRATEGY_EXECUTION_PACK=false to disable. */
export function isStrategyExecutionPackEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_STRATEGY_EXECUTION_PACK, FF.strategyExecutionPackEnabled);
}

/**
 * Optional orchestration conflict synthesis (LLM). Env: FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS=true
 * Default off; deterministic graph build does not require this.
 */
export function isOrchestrationConflictSynthesisEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS,
    FF.orchestrationConflictSynthesisEnabled,
  );
}

function readPercentEnv(env: string | undefined, defaultValue: number): number {
  const raw = env?.trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(0, Math.min(100, parsed));
}

/**
 * Controlled rollout segment for orchestration conflict synthesis.
 * Env: FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS_ROLLOUT_PERCENT (0..100)
 */
export function getOrchestrationConflictSynthesisRolloutPercent(): number {
  return readPercentEnv(
    process.env.FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS_ROLLOUT_PERCENT,
    FF.orchestrationConflictSynthesisRolloutPercent,
  );
}

/**
 * Persisted orchestration pack HTTP API. Env: FEATURE_ORCHESTRATION_PACK_API=false to disable.
 */
export function isOrchestrationPackApiEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_ORCHESTRATION_PACK_API, FF.orchestrationPackApiEnabled);
}

/**
 * Auto-persist orchestration pack at end of strategy phase when latest manifest snapshot exists.
 * Env: FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY=true
 */
export function isOrchestrationPackAutoAfterStrategyEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY,
    FF.orchestrationPackAutoAfterStrategyEnabled,
  );
}

function readEnumFeatureFlag<T extends string>(
  env: string | undefined,
  allowed: readonly T[],
  defaultValue: T,
): T {
  const raw = env?.trim();
  if (!raw) return defaultValue;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : defaultValue;
}

function readFeatureRolloutMode(env: string | undefined, defaultValue: FeatureRolloutMode): FeatureRolloutMode {
  return readEnumFeatureFlag(env, ROLLOUT_MODES, defaultValue);
}

/**
 * Plan-level governance rollout mode for orchestration persistence gate.
 * Env: FEATURE_ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODE
 */
export function getOrchestrationPlanGovernanceRolloutMode(): OrchestrationPlanGovernanceRolloutMode {
  return readEnumFeatureFlag(
    process.env.FEATURE_ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODE,
    ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES,
    FF.orchestrationPlanGovernanceRolloutMode,
  );
}

/** Extended runtime debug logs for pipeline/orchestration event streams. Env: FEATURE_PIPELINE_DEBUG_LOGS=true */
export function isPipelineDebugLogsEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_PIPELINE_DEBUG_LOGS, FF.pipelineDebugLogsEnabled);
}

/**
 * Director orchestration slice generated directly by domain-agent output.
 * When disabled, strict director phases must fail fast before any LLM call.
 * Env: FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT=true
 */
export function isDirectorOrchestrationAgentOutputEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT,
    FF.directorOrchestrationAgentOutputEnabled,
  );
}

/**
 * Timeline-first orchestration UX segment (KPI logs / rollout hooks).
 * Env: FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX=false to disable structured timeline metrics logs.
 */
export function isOrchestrationTimelinePrimaryUxEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX,
    FF.orchestrationTimelinePrimaryUxEnabled,
  );
}

/**
 * When true, roadmap narrative timeline fields are enabled for all users (mirrors SPA `orchestrationRoadmapNarrativeEnabled`).
 * Env: FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ENABLED
 */
export function isOrchestrationRoadmapNarrativeEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ENABLED,
    FF.orchestrationRoadmapNarrativeEnabled,
  );
}

/** Staged rollout mode for client roadmap narrative. Env: FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ROLLOUT_MODE */
export function getOrchestrationRoadmapNarrativeRolloutMode(): FeatureRolloutMode {
  return readFeatureRolloutMode(
    process.env.FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ROLLOUT_MODE,
    FF.orchestrationRoadmapNarrativeRolloutMode,
  );
}

/** On-demand director deep-dive API/UI flow. Env: FEATURE_DIRECTOR_DEEP_DIVE_ON_DEMAND */
export function isDirectorDeepDiveOnDemandEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_DIRECTOR_DEEP_DIVE_ON_DEMAND,
    FF.directorDeepDiveOnDemandEnabled,
  );
}

/** Staged rollout mode for director deep-dive API/UI flow. Env: FEATURE_DIRECTOR_DEEP_DIVE_ROLLOUT_MODE */
export function getDirectorDeepDiveRolloutMode(): FeatureRolloutMode {
  return readFeatureRolloutMode(
    process.env.FEATURE_DIRECTOR_DEEP_DIVE_ROLLOUT_MODE,
    FF.directorDeepDiveRolloutMode,
  );
}

/** Director sub-agent orchestration layer. Env: FEATURE_DIRECTOR_SUB_AGENTS */
export function isDirectorSubAgentsEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_DIRECTOR_SUB_AGENTS,
    FF.directorSubAgentsEnabled,
  );
}

/** CDO deep-dive stub (tech + SEO digital domains). Env: FEATURE_DIRECTOR_CDO_SUB_AGENTS */
export function isDirectorCdoSubAgentsEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_DIRECTOR_CDO_SUB_AGENTS, FF.directorCdoSubAgentsEnabled);
}

/** CAO deep-dive stub (automation / processes). Env: FEATURE_DIRECTOR_CAO_SUB_AGENTS */
export function isDirectorCaoSubAgentsEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_DIRECTOR_CAO_SUB_AGENTS, FF.directorCaoSubAgentsEnabled);
}

/** CSO deep-dive stub (security / compliance). Env: FEATURE_DIRECTOR_CSO_SUB_AGENTS */
export function isDirectorCsoSubAgentsEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_DIRECTOR_CSO_SUB_AGENTS, FF.directorCsoSubAgentsEnabled);
}

/** Staged rollout mode for sub-agent picker and orchestration. Env: FEATURE_DIRECTOR_SUB_AGENTS_ROLLOUT_MODE */
export function getDirectorSubAgentsRolloutMode(): FeatureRolloutMode {
  return readFeatureRolloutMode(
    process.env.FEATURE_DIRECTOR_SUB_AGENTS_ROLLOUT_MODE,
    FF.directorSubAgentsRolloutMode,
  );
}

/**
 * Diagnostic Adaptive Intake pilot — readiness blocking on pipeline start / discover convert.
 * Env: FEATURE_DIAGNOSTIC_INTAKE_PILOT=true
 */
export function isDiagnosticIntakePilotEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_DIAGNOSTIC_INTAKE_PILOT, FF.diagnosticIntakePilotEnabled);
}

/**
 * Execution-plan coverage scope for intake readiness (selected domains ∩ missingForReport).
 * Post-KPI expansion; keep off until Product sets `expand` on the KPI gate.
 * Env: FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE=true
 */
export function isExecutionPlanCoverageScopeEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE,
    FF.executionPlanCoverageScopeEnabled,
  );
}

/**
 * ContextBuilder intake project context envelope (`intake_project_context_envelope`) in agent context payload.
 * Env: FEATURE_PROJECT_CONTEXT_ENVELOPE=true
 */
export function isProjectContextEnvelopeEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_PROJECT_CONTEXT_ENVELOPE,
    FF.projectContextEnvelopeEnabled,
  );
}
