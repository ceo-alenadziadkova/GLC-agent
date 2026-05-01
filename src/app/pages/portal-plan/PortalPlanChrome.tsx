import type { AuditState } from '../../data/audit/contracts/state/audit-state.types';
import { useStrategyJourneyStepStatuses } from '../../hooks/useStrategyJourneyStepStatuses';
import { StrategyPlanningChrome, type StrategyPlanningChromeVariant } from '../strategy-lab/StrategyPlanningChrome';
import type { PlanViewSegmentActive } from '../strategy-lab/PlanViewSegmentedNav';

export type PortalPlanChromeProps = {
  auditId: string;
  isClient: boolean;
  audit: AuditState | null;
} & (
  | {
      /** Roadmap/Timeline surfaces: show segmented nav. */
      planChromeMode?: 'plan';
      activePlanView: PlanViewSegmentActive;
    }
  | {
      /** Manifest wizard: same journey IA without Roadmap|Timeline tabs. */
      planChromeMode: 'manifest-wizard';
    }
);

/**
 * Consultant/client plan shell: delegates to {@link StrategyPlanningChrome} for consistent journey + workbench layout.
 */
export function PortalPlanChrome(props: PortalPlanChromeProps) {
  const { auditId, isClient, audit } = props;

  const variant: StrategyPlanningChromeVariant =
    props.planChromeMode === 'manifest-wizard'
      ? { kind: 'manifest-wizard' }
      : { kind: 'plan', activePlanView: props.activePlanView };

  const steps = useStrategyJourneyStepStatuses(audit);

  return (
    <StrategyPlanningChrome auditId={auditId} isClient={isClient} audit={audit} variant={variant} steps={steps} />
  );
}
