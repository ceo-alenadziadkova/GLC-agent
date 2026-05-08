import type { OrchestrationPlanGovernanceDto } from '../../../data/api/orchestration-types';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';

type PackInputQuality = NonNullable<GlcOrchestrationPackView['input_quality']>;

export type OrchestrationPlanGovernanceCardProps = {
  planGovernance: OrchestrationPlanGovernanceDto;
  governanceHints: ReadonlyArray<string>;
  /** Optional pack input-quality row when governance is tied to an existing pack row. */
  packInputQuality: PackInputQuality | null | undefined;
};

/** Plan governance scores and hints — extracted from {@link StrategyLabOrchestrationPanel} for readability. */
export function OrchestrationPlanGovernanceCard({
  planGovernance,
  governanceHints,
  packInputQuality,
}: OrchestrationPlanGovernanceCardProps) {
  return (
    <div className="bg-background space-y-2 rounded-lg border p-3">
      <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.governanceTitle}</div>
      <p className="text-muted-foreground text-xs max-w-prose">
        {ORCHESTRATION_UI_COPY.governanceDecisionHintLabel}: {planGovernance.decision_hint}
      </p>
      {packInputQuality ? (
        <p className="text-muted-foreground text-xs max-w-prose">
          {ORCHESTRATION_UI_COPY.governanceInputHeaderLabel}: {packInputQuality.input_gate_status} (
          {packInputQuality.input_mode})
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Status: {planGovernance.status} ({planGovernance.decision}, mode: {planGovernance.rollout_mode})
      </p>
      <p className="text-muted-foreground text-xs">
        {ORCHESTRATION_UI_COPY.governanceScoresLabel} {Math.round(planGovernance.dependency_integrity_score * 100)}% /{' '}
        {Math.round(planGovernance.confidence_coverage_score * 100)}% / {Math.round(planGovernance.risk_coverage_score * 100)}%
      </p>
      <p className="text-muted-foreground text-xs">
        Plan scores: {Math.round(planGovernance.integrity_score * 100)}% / {Math.round(planGovernance.coverage_score * 100)}% /{' '}
        {Math.round(planGovernance.confidence_score * 100)}%
      </p>
      <p className="text-muted-foreground text-xs">
        {ORCHESTRATION_UI_COPY.governanceCriticalPathCoverageLabel}: {Math.round(planGovernance.critical_path_node_ratio * 100)}%
      </p>
      {planGovernance.warnings.length > 0 ? (
        <ul className="text-foreground list-inside list-disc text-xs max-w-prose">
          {planGovernance.warnings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {governanceHints.length > 0 ? (
        <div>
          <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.governanceReasonHintTitle}</div>
          <ul className="text-foreground list-inside list-disc text-xs max-w-prose">
            {governanceHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
