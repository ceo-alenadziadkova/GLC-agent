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
 *
 * @see [ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1](../../docs/adrs/ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1.md) — if an idea-only SKU is ever Accepted, new flags belong here (additive; do not replace audit-first flags).
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

function readCsvEnv(env: string | undefined, defaultValue: readonly string[]): readonly string[] {
  const raw = env?.trim();
  if (!raw) return defaultValue;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
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

/** CDO LLM orchestration for `ux_conversion` deep-dive (MVP 3 sub-agents). Env: FEATURE_CDO_DEEP_DIVE_LLM */
export function isCdoDeepDiveLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_CDO_DEEP_DIVE_LLM, FF.cdoDeepDiveLlmEnabled);
}

/** CAO LLM orchestration for `automation_processes` deep-dive (MVP 3 sub-agents). Env: FEATURE_CAO_DEEP_DIVE_LLM */
export function isCaoDeepDiveLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_CAO_DEEP_DIVE_LLM, FF.caoDeepDiveLlmEnabled);
}

/** CSO LLM orchestration for `security_compliance` deep-dive (MVP 3 sub-agents). Env: FEATURE_CSO_DEEP_DIVE_LLM */
export function isCsoDeepDiveLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_CSO_DEEP_DIVE_LLM, FF.csoDeepDiveLlmEnabled);
}

/** CTO LLM orchestration for `tech_infrastructure` deep-dive. Env: FEATURE_CTO_DEEP_DIVE_LLM */
export function isCtoDeepDiveLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_CTO_DEEP_DIVE_LLM, FF.ctoDeepDiveLlmEnabled);
}

/** SEO LLM orchestration for `seo_digital` deep-dive. Env: FEATURE_SEO_DEEP_DIVE_LLM */
export function isSeoDeepDiveLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_SEO_DEEP_DIVE_LLM, FF.seoDeepDiveLlmEnabled);
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
 * F1: deterministic next-question / stop API for public intake (no LLM; ADR-INTAKE-NEXT-QUESTION-V1).
 * Env: FEATURE_INTAKE_NEXT_QUESTION
 */
export function isIntakeNextQuestionEndpointEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_INTAKE_NEXT_QUESTION, FF.intakeNextQuestionEndpointEnabled);
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

/** NL ingress LLM mapper (intake `/nl-describe`). Env: FEATURE_NL_INGRESS_LLM */
export function isNlIngressLlmEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_NL_INGRESS_LLM, FF.nlIngressLlmEnabled);
}

/** Intelligence snapshot LLM (intake `POST /intelligence-snapshot`). Env: FEATURE_INTAKE_INTELLIGENCE_SNAPSHOT_LLM */
export function isIntakeIntelligenceSnapshotLlmEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_INTAKE_INTELLIGENCE_SNAPSHOT_LLM,
    FF.intakeIntelligenceSnapshotLlmEnabled,
  );
}

/** B1 wording pass (`POST /brief/intelligence-wording`). Env: FEATURE_INTAKE_INTELLIGENCE_WORDING_LLM */
export function isIntakeIntelligenceWordingLlmEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_INTAKE_INTELLIGENCE_WORDING_LLM,
    FF.intakeIntelligenceWordingLlmEnabled,
  );
}

const DEFAULT_INTAKE_WORDING_VOICE =
  'Voice: clear, professional, empathetic, concise. Never invent a new question; only rephrase the label for the given id.';

/** Extra copy-hint appended to the wording system prompt. Env: FEATURE_INTAKE_WORDING_VOICE_HINT */
export function getIntakeIntelligenceWordingVoiceSystemLine(): string {
  const hint = process.env.FEATURE_INTAKE_WORDING_VOICE_HINT?.trim();
  if (hint && hint.length > 0) {
    return `${DEFAULT_INTAKE_WORDING_VOICE} ${hint}`;
  }
  return DEFAULT_INTAKE_WORDING_VOICE;
}

/** Rollout mode for NL ingress LLM mapper. Env: FEATURE_NL_INGRESS_LLM_ROLLOUT_MODE */
export function getNlIngressLlmRolloutMode(): FeatureRolloutMode {
  return readFeatureRolloutMode(
    process.env.FEATURE_NL_INGRESS_LLM_ROLLOUT_MODE,
    FF.nlIngressLlmRolloutMode,
  );
}

/** Percent rollout for NL ingress LLM pilot mode. Env: FEATURE_NL_INGRESS_LLM_ROLLOUT_PERCENT */
export function getNlIngressLlmRolloutPercent(): number {
  return readPercentEnv(
    process.env.FEATURE_NL_INGRESS_LLM_ROLLOUT_PERCENT,
    FF.nlIngressLlmRolloutPercent,
  );
}

/** Internal canary allowlist (token prefixes or full tokens). Env: FEATURE_NL_INGRESS_LLM_ALLOWLIST_TOKENS */
export function getNlIngressLlmAllowlistTokens(): string[] {
  const raw = process.env.FEATURE_NL_INGRESS_LLM_ALLOWLIST_TOKENS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Geo-group allowlist for NL ingress LLM rollout. Env: FEATURE_NL_INGRESS_LLM_GEO_GROUPS */
export function getNlIngressLlmGeoGroups(): string[] {
  const raw = process.env.FEATURE_NL_INGRESS_LLM_GEO_GROUPS?.trim() ?? FF.nlIngressLlmGeoGroups;
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Client pack graph consultant canvas (mirrors SPA `packGraphConsultantCanvasEnabled`). Env: FEATURE_PACK_GRAPH_CONSULTANT_CANVAS */
export function isPackGraphConsultantCanvasEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_PACK_GRAPH_CONSULTANT_CANVAS, FF.packGraphConsultantCanvasEnabled);
}

/** Evidence taxonomy drill-down surfaces. Env: FEATURE_EVIDENCE_DRILLDOWN */
export function isEvidenceDrilldownEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_EVIDENCE_DRILLDOWN, FF.evidenceDrilldownEnabled);
}

/** Portal execution-pack repeat-flow dialog. Env: FEATURE_EXECUTION_PACK_REPEAT_FLOW */
export function isExecutionPackRepeatFlowEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_EXECUTION_PACK_REPEAT_FLOW, FF.executionPackRepeatFlowEnabled);
}

/** Consultant `/audit/:id/orchestration` cockpit + pack view metric. Env: FEATURE_CONSULTANT_ORCHESTRATION_COCKPIT */
export function isConsultantOrchestrationCockpitEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_CONSULTANT_ORCHESTRATION_COCKPIT,
    FF.consultantOrchestrationCockpitEnabled,
  );
}

/** POST pack `govern_action` (accept / accept with warnings / refine). Env: FEATURE_CONSULTANT_GOVERNANCE_CTAS */
export function isConsultantGovernanceCtasEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_CONSULTANT_GOVERNANCE_CTAS,
    FF.consultantGovernanceCtasEnabled,
  );
}

/** Dual manifest-preview scenario compare. Env: FEATURE_MANIFEST_SCENARIO_COMPARE */
export function isManifestScenarioCompareEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_MANIFEST_SCENARIO_COMPARE,
    FF.manifestScenarioCompareEnabled,
  );
}

/** Plan-level control object (V4) in pack. Env: FEATURE_PLAN_CONTROL_OBJECT */
export function isPlanControlObjectEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_PLAN_CONTROL_OBJECT, FF.planControlObjectEnabled);
}

/** Anthropic prompt cache (ephemeral) on stable prefixes. Env: FEATURE_LLM_PROMPT_CACHE */
export function isLlmPromptCacheEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_LLM_PROMPT_CACHE, FF.llmPromptCacheEnabled);
}

/**
 * Fire-and-forget Lighthouse on new-audit create + prefill bank hints. Env: FEATURE_NEW_AUDIT_LIGHTHOUSE_BOOTSTRAP
 */
export function isNewAuditLighthouseBootstrapEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_NEW_AUDIT_LIGHTHOUSE_BOOTSTRAP,
    FF.newAuditLighthouseBootstrapEnabled,
  );
}

/** Deterministic new-audit site scrape (recon pre-seed). Env: FEATURE_NEW_AUDIT_SITE_SCRAPE */
export function isNewAuditSiteScrapeEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_NEW_AUDIT_SITE_SCRAPE, FF.newAuditSiteScrapeEnabled);
}

/** Sparse LLM readout (`early_capture`) on authenticated brief snapshot. Env: FEATURE_BRIEF_EARLY_INTELLIGENCE_SNAPSHOT */
export function isBriefEarlyIntelligenceSnapshotEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_BRIEF_EARLY_INTELLIGENCE_SNAPSHOT,
    FF.briefEarlyIntelligenceSnapshotEnabled,
  );
}

/** Copy brief responses from another audit. Env: FEATURE_BRIEF_CLONE_FROM_AUDIT */
export function isBriefCloneFromAuditEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_BRIEF_CLONE_FROM_AUDIT, FF.briefCloneFromAuditEnabled);
}

/**
 * Delivery Board staged rollout (SSOT). Env: `FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE`.
 *
 * Optional ops shorthand when the rollout env is **unset**: `PLAN_DELIVERY_BOARD=true` → `internal`
 * (enables board APIs/tab alignment with older runbooks); `false` → `shadow`. Explicit rollout env always wins.
 */
export function getPlanDeliveryBoardRolloutMode(): FeatureRolloutMode {
  const rolloutExplicit = process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE?.trim();
  if (rolloutExplicit) {
    return readFeatureRolloutMode(rolloutExplicit, FF.planDeliveryBoardRolloutMode);
  }
  const thin = process.env.PLAN_DELIVERY_BOARD?.trim();
  if (thin) {
    return readFeatureFlagEnv(thin, false) ? 'internal' : 'shadow';
  }
  return FF.planDeliveryBoardRolloutMode;
}

/**
 * When true, **`source='manual'`** cards cannot enter **`in_progress`** (PATCH moves + POST manual-card `column_id`).
 * Env: `FEATURE_PLAN_BOARD_STRICT_MANUAL_IN_PROGRESS`
 */
export function isPlanBoardStrictManualInProgressBlocked(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_PLAN_BOARD_STRICT_MANUAL_IN_PROGRESS,
    FF.planBoardStrictManualInProgressBlocked,
  );
}

/** Dry-run reconcile diff (`POST …/plan/board/reconcile/preview`). Env: `FEATURE_PLAN_BOARD_RECONCILE_DIFF_PREVIEW` */
export function isPlanBoardReconcileDiffPreviewEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_PLAN_BOARD_RECONCILE_DIFF_PREVIEW,
    FF.planBoardReconcileDiffPreviewEnabled,
  );
}

/**
 * Pack-persist reconcile uses transactional Postgres RPC (`078_plan_board_reconcile_apply_batch.sql`).
 * Env: `FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY`
 */
export function isPlanBoardReconcileTransactionalApplyEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY,
    FF.planBoardReconcileTransactionalApplyEnabled,
  );
}

/**
 * Per-audit custom board columns (PATCH `…/plan/board/column-policy`). Env: `FEATURE_PLAN_BOARD_CUSTOM_COLUMNS`
 */
export function isPlanBoardCustomColumnsFeatureEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_PLAN_BOARD_CUSTOM_COLUMNS, FF.planBoardCustomColumnsEnabled);
}

/**
 * Board execution hints enqueue as manifest draft revisions (POST `…/roadmap/manifest/draft-revisions`).
 * Env: `FEATURE_MANIFEST_DRAFT_REVISIONS_FROM_BOARD`
 */
export function isManifestDraftRevisionsFromBoardEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_MANIFEST_DRAFT_REVISIONS_FROM_BOARD,
    FF.manifestDraftRevisionsFromBoardEnabled,
  );
}

// ─── Collaborative Director Protocol ────────────────────────────────────────
//
// Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
// Rollout: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-ROLLOUT.md`.
// All thresholds and caps live in `server/src/config/coalition-protocol-policy.ts`.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Master switch for the Collaborative Director Protocol. When false, the
 * pipeline runs in legacy mode (byte-equivalent to pre-protocol behavior).
 * Env: `FEATURE_COALITION_PROTOCOL_ENABLED`.
 */
export function isCoalitionProtocolEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_COALITION_PROTOCOL_ENABLED, FF.coalitionProtocolEnabled);
}

/**
 * Rollout mode (`shadow | internal | pilot | ga`).
 *
 * - `shadow`: coalition phases run, results persist, but Phase 4 finalize ignores them.
 * - `internal+`: coalition results feed finalize and the Approve-Coalition gate replaces Gate 1.
 *
 * Env: `FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE`.
 */
export function getCoalitionProtocolRolloutMode(): FeatureRolloutMode {
  return readFeatureRolloutMode(
    process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE,
    FF.coalitionProtocolRolloutMode as FeatureRolloutMode,
  );
}

export function getCoalitionProtocolAllowlistUserIds(): readonly string[] {
  return readCsvEnv(
    process.env.FEATURE_COALITION_PROTOCOL_ALLOWLIST_USER_IDS,
    FF.coalitionProtocolAllowlistUserIds,
  );
}

export function getCoalitionProtocolAllowlistClientIds(): readonly string[] {
  return readCsvEnv(
    process.env.FEATURE_COALITION_PROTOCOL_ALLOWLIST_CLIENT_IDS,
    FF.coalitionProtocolAllowlistClientIds,
  );
}

/**
 * Returns true when the rollout mode allows coalition results to feed Phase 4
 * finalize. False under `shadow` (collect-only) or when the master switch is off.
 */
export function isCoalitionProtocolFinalizingEnabled(): boolean {
  if (!isCoalitionProtocolEnabled()) return false;
  const mode = getCoalitionProtocolRolloutMode();
  return mode !== 'shadow';
}

/**
 * V2+ iterative multi-turn between directors during Phase 3 (conflict resolver).
 * V1 always uses single-call. Env: `FEATURE_COALITION_PHASE3_ITERATIVE`.
 */
export function isCoalitionPhase3IterativeEnabled(): boolean {
  return readFeatureFlagEnv(
    process.env.FEATURE_COALITION_PHASE3_ITERATIVE,
    FF.coalitionPhase3IterativeEnabled,
  );
}

/**
 * Allows auto-loop to retrigger Phase 0.5 (Context Director) when the resolver
 * surfaces escalations or critical-confidence assumptions. Capped per audit by
 * `COALITION_AUTO_LOOP_MAX_RUNS` in policy. Env: `FEATURE_COALITION_AUTO_LOOP_ENABLED`.
 */
export function isCoalitionAutoLoopEnabled(): boolean {
  return readFeatureFlagEnv(process.env.FEATURE_COALITION_AUTO_LOOP_ENABLED, FF.coalitionAutoLoopEnabled);
}
