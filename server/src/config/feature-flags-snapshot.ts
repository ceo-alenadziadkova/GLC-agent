import {
  getAutoLoopAllowedModes,
  getAutoLoopExecutionProfile,
  isAutoLoopEnabled,
  isAutoRemediationEnabled,
  isBanditsEnabled,
  isBenchmarksEnabled,
  isCausalDagEnabled,
  isEvaluationDatasetsExplicitInternalConsentRequired,
  isEvaluationDatasetsInsertEnabled,
  isSecurityTxtConnectorEnabled,
  isOrchestrationConflictSynthesisEnabled,
  isOrchestrationPackApiEnabled,
  isStrategyExecutionPackEnabled,
} from './feature-flags.js';

export interface EffectiveFeatureFlagsSnapshot {
  evaluationDatasetsInsertEnabled: boolean;
  evaluationDatasetsRequireExplicitInternalConsent: boolean;
  securityTxtConnectorEnabled: boolean;
  banditsEnabled: boolean;
  autoLoopEnabled: boolean;
  autoLoopExecutionProfile: string | undefined;
  autoLoopAllowedModes: string[];
  causalDagEnabled: boolean;
  autoRemediationEnabled: boolean;
  benchmarksEnabled: boolean;
  strategyExecutionPackEnabled: boolean;
  orchestrationConflictSynthesisEnabled: boolean;
  orchestrationPackApiEnabled: boolean;
}

/**
 * Computes effective feature-flag runtime state from the facade.
 * Safe for startup logs: contains no secrets.
 */
export function getEffectiveFeatureFlagsSnapshot(): EffectiveFeatureFlagsSnapshot {
  return {
    evaluationDatasetsInsertEnabled: isEvaluationDatasetsInsertEnabled(),
    evaluationDatasetsRequireExplicitInternalConsent: isEvaluationDatasetsExplicitInternalConsentRequired(),
    securityTxtConnectorEnabled: isSecurityTxtConnectorEnabled(),
    banditsEnabled: isBanditsEnabled(),
    autoLoopEnabled: isAutoLoopEnabled(),
    autoLoopExecutionProfile: getAutoLoopExecutionProfile(),
    autoLoopAllowedModes: getAutoLoopAllowedModes(),
    causalDagEnabled: isCausalDagEnabled(),
    autoRemediationEnabled: isAutoRemediationEnabled(),
    benchmarksEnabled: isBenchmarksEnabled(),
    strategyExecutionPackEnabled: isStrategyExecutionPackEnabled(),
    orchestrationConflictSynthesisEnabled: isOrchestrationConflictSynthesisEnabled(),
    orchestrationPackApiEnabled: isOrchestrationPackApiEnabled(),
  };
}
