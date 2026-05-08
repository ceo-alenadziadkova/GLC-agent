import { Info, WarningCircle } from '@phosphor-icons/react';
import { PIPELINE_MONITOR_COPY as PM } from '../../../../config/pipeline-monitor-copy';
import { SectionLabel } from '../../../../components/glc/SectionLabel';
import type { PhaseDetailCopy } from './phase-detail-types';

type Governance = {
  controlObject: {
    decision_hint?: string;
    auto_remediation_applied_count?: number;
    confidence: { overall: number };
    counts: {
      total_claims: number;
      statuses: { likely_hallucination: number; risky_promise: number };
    };
    human_attention_required: { required: boolean; reasons: string[] };
  } | null;
  refine: { reasoning: string } | null;
};

type Props = {
  governance: Governance;
  phaseHasAgentOutput: boolean;
  isClient: boolean;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailGovernancePanel(props: Props) {
  const { governance, phaseHasAgentOutput, isClient, detailCopy } = props;
  return (
    <>
      {!isClient && phaseHasAgentOutput && governance.refine && (
        <div className="bg-warning/10 border-warning/40 rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <WarningCircle className="text-warning h-4 w-4 flex-shrink-0" />
            <span className="text-foreground text-sm font-semibold">{detailCopy.governanceRefineTitle}</span>
          </div>
          <p className="text-muted-foreground ml-6 mb-2 text-xs">{detailCopy.governanceRefineBody}</p>
          <p className="text-muted-foreground ml-6 text-xs leading-relaxed">{governance.refine.reasoning}</p>
        </div>
      )}

      {!isClient &&
        phaseHasAgentOutput &&
        !governance.refine &&
        governance.controlObject?.decision_hint === 'accept_with_warnings' && (
          <div className="bg-info/10 border-info/40 rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="text-info h-4 w-4 flex-shrink-0" />
              <span className="text-foreground text-sm font-semibold">{PM.detail.governanceWarningsTitle}</span>
            </div>
            <p className="text-muted-foreground ml-6 text-xs">{PM.detail.governanceWarningsBody}</p>
          </div>
        )}

      {!isClient && phaseHasAgentOutput && governance.controlObject && (
        <div className="glc-card rounded-xl p-4">
          <SectionLabel className="mb-2">{detailCopy.governanceSummaryTitle}</SectionLabel>
          {(governance.controlObject.auto_remediation_applied_count ?? 0) > 0 && (
            <div className="text-success mb-3 inline-block rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs font-semibold">
              {detailCopy.governanceAutoRemediationBadge.replace(
                '{count}',
                String(governance.controlObject.auto_remediation_applied_count),
              )}
            </div>
          )}
          <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt>{detailCopy.governanceConfidence}</dt>
            <dd className="font-mono text-right">{governance.controlObject.confidence.overall}</dd>
            <dt>{detailCopy.governanceClaims}</dt>
            <dd className="font-mono text-right">{governance.controlObject.counts.total_claims}</dd>
            <dt>{detailCopy.governanceHallucination}</dt>
            <dd className="font-mono text-right">{governance.controlObject.counts.statuses.likely_hallucination}</dd>
            <dt>{detailCopy.governanceRiskyPromise}</dt>
            <dd className="font-mono text-right">{governance.controlObject.counts.statuses.risky_promise}</dd>
          </dl>
          {governance.controlObject.human_attention_required.required && (
            <p className="text-warning-foreground mt-3 text-xs">
              {detailCopy.governanceHumanAttention}
              {governance.controlObject.human_attention_required.reasons.length > 0
                ? `: ${governance.controlObject.human_attention_required.reasons.join(', ')}`
                : ''}
            </p>
          )}
        </div>
      )}
    </>
  );
}
