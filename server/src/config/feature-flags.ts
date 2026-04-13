import { SYSTEM_DEFAULTS } from './system-defaults.js';

/**
 * Server feature flags — single facade for product toggles.
 *
 * Today: reads documented ops env vars at call time (tests can stub env between calls).
 * Future: swap implementation to FEATURE_FLAGS_JSON / DB / provider without changing call sites.
 *
 * Do not read these env keys from services directly; import from this module only.
 */

/** Per-phase evaluation_datasets inserts. Env: EVALUATION_DATASETS_INSERT=false to disable. */
export function isEvaluationDatasetsInsertEnabled(): boolean {
  return process.env.EVALUATION_DATASETS_INSERT !== 'false';
}

/** ML bandit variant selection. Env: FEATURE_BANDITS=true */
export function isBanditsEnabled(): boolean {
  return process.env.FEATURE_BANDITS === 'true';
}

/** Auto-loop agent rerun on refine. Env: AUTO_LOOP_ENABLED=true */
export function isAutoLoopEnabled(): boolean {
  return process.env.AUTO_LOOP_ENABLED === 'true';
}

/**
 * Execution mode names allowed for auto-loop (comma-separated).
 * Env: AUTO_LOOP_ALLOWED_MODES (default sandbox,internal).
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

/** Public security.txt connector for security_compliance. Env: CONNECTOR_SECURITY_TXT_ENABLED=false to disable. */
export function isSecurityTxtConnectorEnabled(): boolean {
  return process.env.CONNECTOR_SECURITY_TXT_ENABLED !== 'false';
}

/** Cross-phase causal DAG (audit_claim_graph, trace.causal_chain). Env: FEATURE_CAUSAL_DAG=true */
export function isCausalDagEnabled(): boolean {
  return process.env.FEATURE_CAUSAL_DAG === 'true';
}

/** Auto-remediation of fixable tone issues on cleaned domain output. Env: FEATURE_AUTO_REMEDIATION=true */
export function isAutoRemediationEnabled(): boolean {
  return process.env.FEATURE_AUTO_REMEDIATION === 'true';
}

/** Domain benchmarks: API reads, pipeline attaches benchmark_reference_id, recompute endpoints. Env: FEATURE_BENCHMARKS=true */
export function isBenchmarksEnabled(): boolean {
  return process.env.FEATURE_BENCHMARKS === 'true';
}
