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
};

export function StudioModeSummarySection(props: StudioModeSummarySectionProps) {
  const { policyMode, policyBannerStats, tracePlan, traceError, branchFocusSize } = props;

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
    </div>
  );
}
