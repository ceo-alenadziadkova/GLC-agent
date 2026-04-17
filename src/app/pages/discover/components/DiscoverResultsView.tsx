import { ArrowLeft, ArrowRight, Buildings, ChartBar, CheckCircle, Users } from '@phosphor-icons/react';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';
import type { DiscoveryFinding } from '../../../lib/discovery-flow';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';
import { AuditTeaser } from './AuditTeaser';
import { ContactCaptureForm } from './ContactCaptureForm';
import { FindingCard } from './FindingCard';
import { teamOfPhrase } from '../services';

type DiscoverResultsViewProps = {
  isSplit: boolean;
  embedExpanded: boolean;
  findings: DiscoveryFinding[];
  industry: string | null;
  teamSize: string | null;
  signalCount: number;
  sessionToken: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
  contactSaving: boolean;
  contactSaved: boolean;
  contactError: string | null;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onContactCompanyChange: (value: string) => void;
  onContactSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
};

export function DiscoverResultsView(props: DiscoverResultsViewProps) {
  const {
    isSplit,
    embedExpanded,
    findings,
    industry,
    teamSize,
    signalCount,
    sessionToken,
    contactName,
    contactEmail,
    contactPhone,
    contactCompany,
    contactSaving,
    contactSaved,
    contactError,
    onContactNameChange,
    onContactEmailChange,
    onContactPhoneChange,
    onContactCompanyChange,
    onContactSubmit,
    onBack,
  } = props;

  const industryStr = industry ?? discoverResultsUi.copy.signalsIndustryFallback;
  const standaloneResults = !isSplit;
  const compactSplitResults = false;
  const comfortableWidth = 'max-w-3xl sm:max-w-4xl lg:max-w-5xl';
  const loginTarget = sessionToken
    ? buildAppRoute.loginWithDiscovery(sessionToken)
    : APP_ROUTE_PATHS.login;

  return (
    <div
      className={`${
        compactSplitResults
          ? 'relative max-h-[min(78vh,52rem)] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl'
          : standaloneResults
            ? 'flex min-h-screen w-full min-w-0 flex-col items-stretch px-4 py-10 sm:px-6 sm:py-14'
            : 'relative flex w-full min-w-0 flex-col items-stretch px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10'
      } bg-background`}
    >
      <div
        className={`${
          compactSplitResults
            ? 'pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'
            : standaloneResults
              ? 'pointer-events-none fixed inset-0'
              : 'pointer-events-none absolute inset-0'
        } z-0 bg-[radial-gradient(circle_at_top,rgba(30,58,138,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.18),transparent_60%)]`}
        aria-hidden
      />
      <div
        className={`relative z-10 mx-auto w-full min-w-0 ${comfortableWidth} ${compactSplitResults ? 'px-3 py-6 sm:px-4 sm:py-7' : 'px-4 sm:px-6'}`}
      >
        <div className={`flex items-center justify-center gap-2 ${compactSplitResults ? 'mb-6' : 'mb-8 sm:mb-10'}`}>
          <div className="bg-gradient-to-r from-sky-400 to-sky-600 flex h-8 w-8 items-center justify-center rounded-lg">
            <ChartBar size={18} weight="bold" className="text-primary-foreground" />
          </div>
          <span className="text-foreground text-base font-bold tracking-[-0.01em]">
            GLC Audit
          </span>
        </div>
        <div className={`w-full min-w-0 max-w-full ${compactSplitResults ? 'space-y-5' : 'space-y-6 sm:space-y-7'}`}>
          <div
            key={embedExpanded ? 'discovery-results-wide' : 'discovery-results-split'}
            className={`w-full min-w-0 max-w-full ${compactSplitResults ? 'space-y-5' : 'space-y-6 sm:space-y-7'}`}
          >
            <header className="text-center mb-1 px-0 min-w-0">
              <div
                className="bg-info/10 border-info/40 mb-3 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 sm:mb-4"
              >
                <CheckCircle size={15} weight="fill" className="text-info shrink-0" />
                <span className="text-info break-words text-left text-xs font-semibold tracking-[0.06em] sm:text-center">
                  {discoverResultsUi.copy.analysisComplete}
                </span>
              </div>
              <h1
                className={`text-foreground break-words px-0.5 text-pretty font-extrabold tracking-[-0.02em] leading-tight ${
                  compactSplitResults
                    ? 'text-[clamp(1.125rem,3.2vw+0.5rem,1.5rem)]'
                    : 'text-[clamp(1.375rem,2.5vw,1.75rem)]'
                }`}
              >
                {discoverResultsUi.copy.resultsTitle}
              </h1>
              <p
                className={`text-muted-foreground mx-auto mt-2.5 max-w-full break-words px-0.5 text-pretty leading-relaxed ${
                  compactSplitResults ? 'text-sm' : 'text-[1.0625rem]'
                }`}
              >
                {discoverResultsUi.copy.signalsPrefix} {signalCount} signals
                {industryStr && industryStr !== discoverResultsUi.copy.signalsIndustryFallback ? ` — ${industryStr}` : ''}
                {teamSize ? `${discoverResultsUi.copy.teamPrefix}${teamOfPhrase(teamSize)}` : ''}
              </p>
            </header>
            <div
              className="bg-card min-w-0 max-w-full overflow-hidden rounded-2xl border p-5 text-center sm:p-6"
            >
              <Buildings size={26} className="text-info mx-auto mb-3" />
              <p className="text-foreground mx-auto mb-[18px] max-w-full break-words text-pretty text-[1.0625rem] font-bold leading-[1.55] sm:max-w-md">
                {discoverResultsUi.copy.ctaTitle}
              </p>
              <a
                href={loginTarget}
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-5 py-3 text-[0.9375rem] font-semibold text-white no-underline sm:px-6"
              >
                <Users size={18} className="shrink-0" />
                <span className="break-words text-center">{discoverResultsUi.copy.ctaButton}</span>
                <ArrowRight size={16} className="shrink-0" />
              </a>
              <p className="text-muted-foreground mt-3 text-[0.8125rem]">
                {discoverResultsUi.copy.ctaFootnote}
              </p>
            </div>
            {findings.length > 0 ? (
              <div className="min-w-0">
                <div className="min-w-0 space-y-4 sm:space-y-5">
                  {findings.map(finding => (
                    <div key={finding.id} className="min-w-0 w-full max-w-full">
                      <FindingCard finding={finding} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card min-w-0 max-w-full overflow-hidden rounded-2xl border p-5 text-center sm:p-6">
                <CheckCircle size={26} weight="fill" className="text-success mx-auto mb-3" />
                <p className="text-foreground text-base font-semibold">
                  {discoverResultsUi.copy.noGapsTitle}
                </p>
                <p className="text-muted-foreground mx-auto mt-2 max-w-md text-pretty text-[0.9375rem] leading-[1.65]">
                  {discoverResultsUi.copy.noGapsBody}
                </p>
              </div>
            )}
            <AuditTeaser industry={industry} />
          </div>
          <ContactCaptureForm
            contactName={contactName}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactCompany={contactCompany}
            onContactNameChange={onContactNameChange}
            onContactEmailChange={onContactEmailChange}
            onContactPhoneChange={onContactPhoneChange}
            onContactCompanyChange={onContactCompanyChange}
            contactSaving={contactSaving}
            contactSaved={contactSaved}
            contactError={contactError}
            onSubmit={onContactSubmit}
          />
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground mx-auto flex items-center gap-2 rounded-lg bg-transparent py-2 text-[0.9375rem]"
          >
            <ArrowLeft size={16} aria-hidden /> {discoverResultsUi.copy.backReview}
          </button>
        </div>
      </div>
    </div>
  );
}
