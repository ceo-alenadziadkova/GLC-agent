export interface IntakePilotKpiGateInput {
  windowLabel: string;
  completionNonRegressionPass: boolean;
  readinessQualifiedContextUpliftPass: boolean;
  falseBlockedTrendPass: boolean;
}

export type IntakePilotKpiGateDecision = 'expand' | 'hold';

export interface IntakePilotKpiGateEvaluation {
  windowLabel: string;
  completionNonRegressionPass: boolean;
  readinessQualifiedContextUpliftPass: boolean;
  falseBlockedTrendPass: boolean;
  decision: IntakePilotKpiGateDecision;
}

/**
 * ADR gate policy:
 * expand only when all KPI checks pass in the selected review window.
 */
export function evaluatePilotKpiGate(input: IntakePilotKpiGateInput): IntakePilotKpiGateEvaluation {
  const decision: IntakePilotKpiGateDecision =
    input.completionNonRegressionPass
    && input.readinessQualifiedContextUpliftPass
    && input.falseBlockedTrendPass
      ? 'expand'
      : 'hold';

  return {
    windowLabel: input.windowLabel,
    completionNonRegressionPass: input.completionNonRegressionPass,
    readinessQualifiedContextUpliftPass: input.readinessQualifiedContextUpliftPass,
    falseBlockedTrendPass: input.falseBlockedTrendPass,
    decision,
  };
}
