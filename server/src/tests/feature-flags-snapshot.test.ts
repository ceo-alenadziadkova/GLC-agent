import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEffectiveFeatureFlagsSnapshot } from '../config/feature-flags-snapshot.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import * as featureFlags from '../config/feature-flags.js';

const FF = SYSTEM_DEFAULTS.featureFlags;
const autoLoopDefault = [...SYSTEM_DEFAULTS.autoLoop.allowedModesDefault];

describe('getEffectiveFeatureFlagsSnapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(featureFlags, 'isEvaluationDatasetsInsertEnabled').mockReturnValue(
      FF.evaluationDatasetsInsertEnabled,
    );
    vi.spyOn(featureFlags, 'isEvaluationDatasetsExplicitInternalConsentRequired').mockReturnValue(
      FF.evaluationDatasetsRequireExplicitInternalConsent,
    );
    vi.spyOn(featureFlags, 'isSecurityTxtConnectorEnabled').mockReturnValue(FF.securityTxtConnectorEnabled);
    vi.spyOn(featureFlags, 'isBanditsEnabled').mockReturnValue(FF.banditsEnabled);
    vi.spyOn(featureFlags, 'isAutoLoopEnabled').mockReturnValue(FF.autoLoopEnabled);
    vi.spyOn(featureFlags, 'getAutoLoopExecutionProfile').mockReturnValue(undefined);
    vi.spyOn(featureFlags, 'getAutoLoopAllowedModes').mockReturnValue(autoLoopDefault);
    vi.spyOn(featureFlags, 'isCausalDagEnabled').mockReturnValue(FF.causalDagEnabled);
    vi.spyOn(featureFlags, 'isAutoRemediationEnabled').mockReturnValue(FF.autoRemediationEnabled);
    vi.spyOn(featureFlags, 'isBenchmarksEnabled').mockReturnValue(FF.benchmarksEnabled);
    vi.spyOn(featureFlags, 'isStrategyExecutionPackEnabled').mockReturnValue(FF.strategyExecutionPackEnabled);
    vi.spyOn(featureFlags, 'isOrchestrationConflictSynthesisEnabled').mockReturnValue(
      FF.orchestrationConflictSynthesisEnabled,
    );
    vi.spyOn(featureFlags, 'isOrchestrationPackApiEnabled').mockReturnValue(FF.orchestrationPackApiEnabled);
  });

  it('returns defaults when facade exposes defaults', () => {
    const snapshot = getEffectiveFeatureFlagsSnapshot();

    expect(snapshot).toEqual({
      evaluationDatasetsInsertEnabled: FF.evaluationDatasetsInsertEnabled,
      evaluationDatasetsRequireExplicitInternalConsent: FF.evaluationDatasetsRequireExplicitInternalConsent,
      securityTxtConnectorEnabled: FF.securityTxtConnectorEnabled,
      banditsEnabled: FF.banditsEnabled,
      autoLoopEnabled: FF.autoLoopEnabled,
      autoLoopExecutionProfile: undefined,
      autoLoopAllowedModes: autoLoopDefault,
      causalDagEnabled: FF.causalDagEnabled,
      autoRemediationEnabled: FF.autoRemediationEnabled,
      benchmarksEnabled: FF.benchmarksEnabled,
      strategyExecutionPackEnabled: FF.strategyExecutionPackEnabled,
      orchestrationConflictSynthesisEnabled: FF.orchestrationConflictSynthesisEnabled,
      orchestrationPackApiEnabled: FF.orchestrationPackApiEnabled,
    });
  });

  it('reflects facade overrides independently of process.env FEATURE_* churn', () => {
    vi.mocked(featureFlags.isEvaluationDatasetsInsertEnabled).mockReturnValue(false);
    vi.mocked(featureFlags.isEvaluationDatasetsExplicitInternalConsentRequired).mockReturnValue(true);
    vi.mocked(featureFlags.isSecurityTxtConnectorEnabled).mockReturnValue(false);
    vi.mocked(featureFlags.isBanditsEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.isAutoLoopEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.getAutoLoopExecutionProfile).mockReturnValue('sandbox');
    vi.mocked(featureFlags.getAutoLoopAllowedModes).mockReturnValue(['sandbox', 'internal', 'staging']);
    vi.mocked(featureFlags.isCausalDagEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.isAutoRemediationEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.isBenchmarksEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.isStrategyExecutionPackEnabled).mockReturnValue(false);
    vi.mocked(featureFlags.isOrchestrationConflictSynthesisEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.isOrchestrationPackApiEnabled).mockReturnValue(false);

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
