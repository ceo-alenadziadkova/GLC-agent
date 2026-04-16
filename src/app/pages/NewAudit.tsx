import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle,
  Warning,
  ClipboardText,
  X,
  FloppyDisk,
  Spinner,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import {
  PreBriefModal,
  Step0Basics,
  Step1Brief,
  Step2Confirm,
  StepIndicator,
  useNewAuditWizard,
  type NewAuditVariant,
} from './new-audit';

export function NewAudit(props?: { variant?: NewAuditVariant }) {
  const wizard = useNewAuditWizard(props);
  const variant = props?.variant ?? 'consultant';
  const isClientSelfServe = variant === 'client_self_serve';

  const clientDraftSaveSection = isClientSelfServe ? (
    <div className="mt-5 pt-5 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {wizard.draftError && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--callout-error-bg)', border: '1px solid var(--callout-error-border)', color: 'var(--score-1)' }}
        >
          <Warning className="w-3.5 h-3.5 flex-shrink-0" />
          {wizard.draftError}
        </div>
      )}
      {wizard.draftNotice && !wizard.draftError && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(14,207,130,0.08)', color: 'var(--glc-green-dark)' }}
        >
          <CheckCircle weight="fill" className="w-3.5 h-3.5 flex-shrink-0" />
          {wizard.draftNotice}
        </div>
      )}
      <button
        type="button"
        disabled={wizard.draftSaving}
        onClick={() => {
          void wizard.handleSaveClientDraft();
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          cursor: wizard.draftSaving ? 'wait' : 'pointer',
        }}
      >
        {wizard.draftSaving ? (
          <Spinner className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        ) : (
          <FloppyDisk className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
        )}
        {WORKSPACE_PAGE_COPY.newAudit.draftSaveButton}
      </button>
      <p className="text-xs m-0 leading-relaxed text-center" style={{ color: 'var(--text-quaternary)' }}>
        {WORKSPACE_PAGE_COPY.newAudit.draftSaveTabNote}
      </p>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────
  return (
    <AppShell
      title={WORKSPACE_PAGE_COPY.newAudit.appShellTitle}
      subtitle={
        isClientSelfServe
          ? WORKSPACE_PAGE_COPY.newAudit.appShellSubtitleClient
          : WORKSPACE_PAGE_COPY.newAudit.appShellSubtitleConsultant
      }
      actions={
        isClientSelfServe ? (
          <Link
            to="/portal"
            className="hidden sm:inline text-sm no-underline"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {WORKSPACE_PAGE_COPY.newAudit.backToPortalLabel}
          </Link>
        ) : undefined
      }
    >
      <div
        className="min-h-full flex flex-col items-center justify-center py-8 mobile:py-6 glc-page-content relative"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.55 }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-full ${wizard.step === 1 ? 'sm:max-w-[40rem]' : 'sm:max-w-[28.75rem]'}`}
        >
          {isClientSelfServe && (
            <Link
              to="/portal"
              className="sm:hidden inline-flex items-center gap-1.5 text-sm font-medium no-underline glc-touch-target mb-4"
              style={{ color: 'var(--glc-blue)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            {WORKSPACE_PAGE_COPY.newAudit.backToPortalLabel}
            </Link>
          )}
          <StepIndicator current={wizard.step} />

          {isClientSelfServe && wizard.draftRestoredVisible && (
            <div
              className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: 'var(--callout-info-bg)',
                border: '1px solid var(--callout-info-border)',
              }}
            >
              <ClipboardText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>
                  {WORKSPACE_PAGE_COPY.newAudit.draftRestoredTitle}
                </p>
                <p className="text-xs m-0 mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {WORKSPACE_PAGE_COPY.newAudit.draftRestoredBody}
                </p>
              </div>
              <button
                type="button"
                className="p-1 rounded-md flex-shrink-0"
                style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={WORKSPACE_PAGE_COPY.newAudit.dismissAriaLabel}
                onClick={() => wizard.setDraftRestoredVisible(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence mode="sync">

            {/* ── Step 0: Basics ───────────────────────── */}
            {wizard.step === 0 && (
              <>
                <Step0Basics
                  step0Valid={wizard.step0Valid}
                  isClientSelfServe={wizard.isClientSelfServe}
                  url={wizard.url}
                  setUrl={wizard.setUrl}
                  noPublicWebsite={wizard.noPublicWebsite}
                  setNoPublicWebsite={wizard.setNoPublicWebsite}
                  name={wizard.name}
                  setName={wizard.setName}
                  industry={wizard.industry}
                  setIndustry={wizard.setIndustry}
                  industrySpecify={wizard.industrySpecify}
                  setIndustrySpecify={wizard.setIndustrySpecify}
                  setResponses={wizard.setResponses}
                  coveragePackage={wizard.coveragePackage}
                  setCoveragePackage={wizard.setCoveragePackage}
                  selectedDomains={wizard.selectedDomains}
                  toggleDomainSelection={wizard.toggleDomainSelection}
                  recommendedDomains={wizard.recommendedDomains}
                  onContinue={() => wizard.setStep(1)}
                  clientDraftSaveSection={clientDraftSaveSection}
                  interviewMode={wizard.interviewMode}
                  setInterviewMode={wizard.setInterviewMode}
                  onOpenPreBrief={() => {
                    wizard.setPreBriefOpen(true);
                    wizard.setPreBriefLink(null);
                    wizard.setPreBriefErr(null);
                  }}
                />
                {!isClientSelfServe && (
                  <PreBriefModal
                    isOpen={wizard.preBriefOpen}
                    onClose={wizard.closePreBriefModal}
                    onCreate={wizard.handlePreBriefCreate}
                    company={wizard.preBriefCompany}
                    setCompany={wizard.setPreBriefCompany}
                    website={wizard.preBriefWebsite}
                    setWebsite={wizard.setPreBriefWebsite}
                    industryField={wizard.preBriefIndustryField}
                    setIndustryField={wizard.setPreBriefIndustryField}
                    industrySpecify={wizard.preBriefIndustrySpecify}
                    setIndustrySpecify={wizard.setPreBriefIndustrySpecify}
                    message={wizard.preBriefMessage}
                    setMessage={wizard.setPreBriefMessage}
                    consultantName={wizard.preBriefConsultantName}
                    setConsultantName={wizard.setPreBriefConsultantName}
                    expectedContact={wizard.preBriefExpectedContact}
                    setExpectedContact={wizard.setPreBriefExpectedContact}
                    contactChannel={wizard.preBriefContactChannel}
                    setContactChannel={wizard.setPreBriefContactChannel}
                    email={wizard.preBriefEmail}
                    setEmail={wizard.setPreBriefEmail}
                    whatsapp={wizard.preBriefWhatsapp}
                    setWhatsapp={wizard.setPreBriefWhatsapp}
                    link={wizard.preBriefLink}
                    err={wizard.preBriefErr}
                    loading={wizard.preBriefLoading}
                    consultantNamePlaceholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.consultantNameDefaultPlaceholder}
                  />
                )}
              </>
            )}

            {/* ── Step 1: Brief ─────────────────────────── */}
            {wizard.step === 1 && (
              <Step1Brief
                interviewMode={wizard.interviewMode}
                layoutSelected={wizard.layoutSelected}
                answeredRequired={wizard.answeredRequired}
                pipelineRequiredTotal={wizard.pipelineRequiredTotal}
                briefLayoutChoice={wizard.briefLayoutChoice}
                onChangeConsultantBriefLayout={wizard.handleChangeConsultantBriefLayout}
                onSelectConsultantBriefLayout={wizard.handleSelectConsultantBriefLayout}
                discoveryPrefilled={wizard.discoveryPrefilled}
                intakePrefillActive={wizard.intakePrefillActive}
                progressPct={wizard.progressPct}
                readinessBadge={wizard.readinessBadge}
                nextBestAction={wizard.nextBestAction}
                bankMetrics={wizard.bankMetrics}
                responses={wizard.responses}
                briefProductMode={wizard.briefProductMode}
                noPublicWebsite={wizard.noPublicWebsite}
                intakeAnalytics={wizard.briefWizardIntakeAnalytics}
                onResponsesChange={next => wizard.setResponses(next)}
                onResponseChange={wizard.handleResponseChange}
                onSetUnknown={wizard.handleSetUnknown}
                step2Complete={wizard.step2Complete}
                onBackToStep0={() => wizard.setStep(0)}
                onGoToStep2={() => wizard.setStep(2)}
                clientDraftSaveSection={clientDraftSaveSection}
              />
            )}

            {/* ── Step 2: Confirm ───────────────────────── */}
            {wizard.step === 2 && (
              <Step2Confirm
                url={wizard.url}
                name={wizard.name}
                industry={wizard.industry}
                coveragePackage={wizard.coveragePackage}
                selectedDomains={wizard.selectedDomains}
                answeredRequired={wizard.answeredRequired}
                pipelineRequiredTotal={wizard.pipelineRequiredTotal}
                error={wizard.error}
                loading={wizard.loading}
                isClientSelfServe={isClientSelfServe}
                onBackToStep1={() => wizard.setStep(1)}
                onLaunchSubmit={wizard.handleLaunch}
                clientDraftSaveSection={clientDraftSaveSection}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
