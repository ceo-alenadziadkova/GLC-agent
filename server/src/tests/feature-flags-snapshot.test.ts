import { afterEach, describe, expect, it } from 'vitest';
import { getEffectiveFeatureFlagsSnapshot } from '../config/feature-flags-snapshot.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const ENV_KEYS = [
  'EVALUATION_DATASETS_INSERT',
  'EVALUATION_DATASETS_REQUIRE_INTERNAL_CONSENT',
  'CONNECTOR_SECURITY_TXT_ENABLED',
  'FEATURE_BANDITS',
  'AUTO_LOOP_ENABLED',
  'GLC_DEPLOYMENT_PROFILE',
  'AUTO_LOOP_ALLOWED_MODES',
  'FEATURE_CAUSAL_DAG',
  'FEATURE_AUTO_REMEDIATION',
  'FEATURE_BENCHMARKS',
  'FEATURE_STRATEGY_EXECUTION_PACK',
  'FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS',
  'FEATURE_ORCHESTRATION_PACK_API',
] as const;

const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((k) => [k, process.env[k]]),
);

function restoreEnv(): void {
  for (const [k, v] of originalEnv) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

describe('getEffectiveFeatureFlagsSnapshot', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('returns defaults when env vars are not set', () => {
    for (const k of ENV_KEYS) delete process.env[k];

    const snapshot = getEffectiveFeatureFlagsSnapshot();

    expect(snapshot).toEqual({
      evaluationDatasetsInsertEnabled: SYSTEM_DEFAULTS.featureFlags.evaluationDatasetsInsertEnabled,
      evaluationDatasetsRequireExplicitInternalConsent:
        SYSTEM_DEFAULTS.featureFlags.evaluationDatasetsRequireExplicitInternalConsent,
      securityTxtConnectorEnabled: SYSTEM_DEFAULTS.featureFlags.securityTxtConnectorEnabled,
      banditsEnabled: SYSTEM_DEFAULTS.featureFlags.banditsEnabled,
      autoLoopEnabled: SYSTEM_DEFAULTS.featureFlags.autoLoopEnabled,
      autoLoopExecutionProfile: undefined,
      autoLoopAllowedModes: [...SYSTEM_DEFAULTS.autoLoop.allowedModesDefault],
      causalDagEnabled: SYSTEM_DEFAULTS.featureFlags.causalDagEnabled,
      autoRemediationEnabled: SYSTEM_DEFAULTS.featureFlags.autoRemediationEnabled,
      benchmarksEnabled: SYSTEM_DEFAULTS.featureFlags.benchmarksEnabled,
      strategyExecutionPackEnabled: SYSTEM_DEFAULTS.featureFlags.strategyExecutionPackEnabled,
      orchestrationConflictSynthesisEnabled:
        SYSTEM_DEFAULTS.featureFlags.orchestrationConflictSynthesisEnabled,
      orchestrationPackApiEnabled: SYSTEM_DEFAULTS.featureFlags.orchestrationPackApiEnabled,
    });
  });

  it('reflects explicit env overrides', () => {
    process.env.EVALUATION_DATASETS_INSERT = 'false';
    process.env.EVALUATION_DATASETS_REQUIRE_INTERNAL_CONSENT = 'true';
    process.env.CONNECTOR_SECURITY_TXT_ENABLED = 'false';
    process.env.FEATURE_BANDITS = 'true';
    process.env.AUTO_LOOP_ENABLED = 'true';
    process.env.GLC_DEPLOYMENT_PROFILE = 'sandbox';
    process.env.AUTO_LOOP_ALLOWED_MODES = 'sandbox,internal,staging';
    process.env.FEATURE_CAUSAL_DAG = 'true';
    process.env.FEATURE_AUTO_REMEDIATION = 'true';
    process.env.FEATURE_BENCHMARKS = 'true';
    process.env.FEATURE_STRATEGY_EXECUTION_PACK = 'false';
    process.env.FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS = 'true';
    process.env.FEATURE_ORCHESTRATION_PACK_API = 'false';

    const snapshot = getEffectiveFeatureFlagsSnapshot();

    expect(snapshot).toEqual({
      evaluationDatasetsInsertEnabled: false,
      evaluationDatasetsRequireExplicitInternalConsent: true,
      securityTxtConnectorEnabled: false,
      banditsEnabled: true,
      autoLoopEnabled: true,
      autoLoopExecutionProfile: 'sandbox',
      autoLoopAllowedModes: ['sandbox', 'internal', 'staging'],
      causalDagEnabled: true,
      autoRemediationEnabled: true,
      benchmarksEnabled: true,
      strategyExecutionPackEnabled: false,
      orchestrationConflictSynthesisEnabled: true,
      orchestrationPackApiEnabled: false,
    });
  });
});
