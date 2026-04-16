import { ArrowLeft, ArrowRight, Buildings, ChartBar, CheckCircle, Users } from '@phosphor-icons/react';
import { GLC_BRAND_HEX } from '@glc/brand-tokens';
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
      className={
        compactSplitResults
          ? 'relative max-h-[min(78vh,52rem)] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl'
          : standaloneResults
            ? 'flex min-h-screen w-full min-w-0 flex-col items-stretch px-4 py-10 sm:px-6 sm:py-14'
            : 'relative flex w-full min-w-0 flex-col items-stretch px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10'
      }
      style={{ background: discoverResultsUi.resultsLayout.pageBackground }}
    >
      <div
        className={
          compactSplitResults
            ? 'pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'
            : standaloneResults
              ? 'pointer-events-none fixed inset-0'
              : 'pointer-events-none absolute inset-0'
        }
        style={{ background: discoverResultsUi.resultsLayout.radialGlow, zIndex: 0 }}
        aria-hidden
      />
      <div
        className={`relative z-10 mx-auto w-full min-w-0 ${comfortableWidth} ${compactSplitResults ? 'px-3 py-6 sm:px-4 sm:py-7' : 'px-4 sm:px-6'}`}
      >
        <div className={`flex items-center justify-center gap-2 ${compactSplitResults ? 'mb-6' : 'mb-8 sm:mb-10'}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
            <ChartBar size={18} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: discoverResultsUi.header.brandText, letterSpacing: '-0.01em' }}>
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
                className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full mb-3 sm:mb-4"
                style={{ background: discoverResultsUi.header.analysisBadgeBackground, border: `1px solid ${discoverResultsUi.header.analysisBadgeBorder}` }}
              >
                <CheckCircle size={15} weight="fill" className="shrink-0" style={{ color: discoverResultsUi.header.analysisIcon }} />
                <span className="break-words text-left sm:text-center" style={{ fontSize: '0.75rem', fontWeight: 600, color: discoverResultsUi.header.analysisLabel, letterSpacing: '0.06em' }}>
                  {discoverResultsUi.copy.analysisComplete}
                </span>
              </div>
              <h1
                className="break-words text-pretty px-0.5"
                style={{
                  fontSize: compactSplitResults
                    ? 'clamp(1.125rem, 3.2vw + 0.5rem, 1.5rem)'
                    : 'clamp(1.375rem, 2.5vw, 1.75rem)',
                  fontWeight: 800,
                  color: discoverResultsUi.header.title,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                {discoverResultsUi.copy.resultsTitle}
              </h1>
              <p
                className="break-words text-pretty mx-auto max-w-full px-0.5"
                style={{
                  fontSize: compactSplitResults ? '0.875rem' : '1.0625rem',
                  color: discoverResultsUi.header.subtitle,
                  marginTop: 10,
                  lineHeight: 1.6,
                  overflowWrap: 'anywhere',
                }}
              >
                {discoverResultsUi.copy.signalsPrefix} {signalCount} signals
                {industryStr && industryStr !== discoverResultsUi.copy.signalsIndustryFallback ? ` — ${industryStr}` : ''}
                {teamSize ? `${discoverResultsUi.copy.teamPrefix}${teamOfPhrase(teamSize)}` : ''}
              </p>
            </header>
            <div
              className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 text-center"
              style={{ background: discoverResultsUi.cta.panelBackground, border: `1px solid ${discoverResultsUi.cta.panelBorder}`, boxSizing: 'border-box' }}
            >
              <Buildings size={26} className="mx-auto mb-3" style={{ color: discoverResultsUi.cta.icon }} />
              <p className="mx-auto mb-[18px] max-w-full break-words text-pretty sm:max-w-md" style={{ fontSize: '1.0625rem', fontWeight: 700, color: discoverResultsUi.cta.title, lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                {discoverResultsUi.copy.ctaTitle}
              </p>
              <a
                href={loginTarget}
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold sm:px-6"
                style={{
                  fontSize: '0.9375rem',
                  background: `linear-gradient(135deg, ${GLC_BRAND_HEX.blue}, ${GLC_BRAND_HEX.blueDeep})`,
                  color: '#fff',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <Users size={18} className="shrink-0" />
                <span className="break-words text-center">{discoverResultsUi.copy.ctaButton}</span>
                <ArrowRight size={16} className="shrink-0" />
              </a>
              <p style={{ fontSize: '0.8125rem', color: discoverResultsUi.cta.footnote, marginTop: 12 }}>
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
              <div className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 text-center" style={{ background: discoverResultsUi.emptyFindings.panelBackground, border: `1px solid ${discoverResultsUi.emptyFindings.panelBorder}`, boxSizing: 'border-box' }}>
                <CheckCircle size={26} weight="fill" className="mx-auto mb-3" style={{ color: discoverResultsUi.emptyFindings.icon }} />
                <p className="font-semibold" style={{ fontSize: '1rem', color: discoverResultsUi.emptyFindings.title }}>
                  {discoverResultsUi.copy.noGapsTitle}
                </p>
                <p className="text-pretty max-w-md mx-auto" style={{ fontSize: '0.9375rem', color: discoverResultsUi.emptyFindings.body, marginTop: 8, lineHeight: 1.65 }}>
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
            className="flex items-center gap-2 mx-auto py-2 rounded-lg"
            style={{ fontSize: '0.9375rem', color: 'rgba(248,250,252,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} aria-hidden /> {discoverResultsUi.copy.backReview}
          </button>
        </div>
      </div>
    </div>
  );
}
