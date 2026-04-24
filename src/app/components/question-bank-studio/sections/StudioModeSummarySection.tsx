import { QUESTION_BANK_STUDIO_COPY_EN } from '../../../config/question-bank-studio-copy.en';

type StudioModeSummarySectionProps = {
  policyMode: string;
  policyBannerStats: {
    bankParticipating: number;
    bankTotal: number;
    bankOutsidePolicy: number;
    bankPolicyRequired: number;
    bankPolicyIfVisible: number;
  };
  tracePlan: { visible: string[]; required: string[] } | null;
  traceError: string | null;
  branchFocusSize: number | null;
  intelligenceMetrics?: {
    fullyCoveredQuestions: number;
    totalQuestions: number;
    sprint2Complete: number;
    sprint2GateTotal: number;
  } | null;
};

export function StudioModeSummarySection(props: StudioModeSummarySectionProps) {
  const { policyMode, policyBannerStats, tracePlan, traceError, branchFocusSize, intelligenceMetrics } = props;

  return (
    <div className="rounded-lg px-3 py-2 space-y-1 text-xs leading-snug ds-panel-canvas" >
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase ds-text-tertiary" >
        {QUESTION_BANK_STUDIO_COPY_EN.panels.currentMode}
      </div>
      <p className="m-0 ds-text-secondary" >
        Policy <span className="font-mono">{policyMode}</span> · Bank in policy: <strong>{policyBannerStats.bankParticipating}</strong> / {policyBannerStats.bankTotal}
        {policyBannerStats.bankOutsidePolicy > 0 ? (
          <>
            {' '}
            (<span className="ds-text-quaternary">{policyBannerStats.bankOutsidePolicy} outside slice</span>)
          </>
        ) : null}
        {policyBannerStats.bankPolicyRequired > 0 ? (
          <>
            {' '}
            · Policy required: <strong className="ds-text-accent-orange">{policyBannerStats.bankPolicyRequired}</strong>
          </>
        ) : null}
        {policyBannerStats.bankPolicyIfVisible > 0 ? <> · If visible: <strong>{policyBannerStats.bankPolicyIfVisible}</strong></> : null}
      </p>
      <p className="m-0 ds-type-2xs-quaternary">
        Runtime trace
        {tracePlan ? (
          <>
            {' · '}Trace visible ids: <strong>{tracePlan.visible.length}</strong>
            {tracePlan.required.length > 0 ? <> · required in plan: <strong>{tracePlan.required.length}</strong></> : null}
          </>
        ) : (
          <> · Trace: {traceError ? 'error' : '—'}</>
        )}
        {branchFocusSize !== null ? <> · Branch focus: <strong>{branchFocusSize}</strong> ids</> : null}
      </p>
      {intelligenceMetrics ? (
        <p className="m-0 ds-type-2xs-quaternary">
          {QUESTION_BANK_STUDIO_COPY_EN.panels.intelligenceContract}:{' '}
          {QUESTION_BANK_STUDIO_COPY_EN.panels.bankCoverageLabel}{' '}
          <strong>{intelligenceMetrics.fullyCoveredQuestions}</strong> / {intelligenceMetrics.totalQuestions}
          {' · '}
          {QUESTION_BANK_STUDIO_COPY_EN.panels.sprint2GateLabel}{' '}
          <strong>{intelligenceMetrics.sprint2Complete}</strong> / {intelligenceMetrics.sprint2GateTotal}
        </p>
      ) : null}
    </div>
  );
}
