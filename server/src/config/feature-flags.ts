import { SYSTEM_DEFAULTS } from './system-defaults.js';

/**
 * Server feature flags — single facade for product toggles.
 *
 * Today: reads documented ops env vars at call time (tests can stub env between calls).
 * Future: swap implementation to FEATURE_FLAGS_JSON / DB / provider without changing call sites.
 *
 * Do not read these env keys from services directly; import from this module only.
 */

const FF = SYSTEM_DEFAULTS.featureFlags;

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
