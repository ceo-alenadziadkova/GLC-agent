import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Warning, ClipboardText, X, FloppyDisk, Spinner } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import {
  PreBriefModal,
  Step0Basics,
  Step1Brief,
  Step2Review,
  Step3Launch,
  StepIndicator,
  useNewAuditWizard,
  type NewAuditVariant,
} from './new-audit';
import { cn } from '../components/ui/utils';

export function NewAudit(props?: { variant?: NewAuditVariant }) {
  const wizard = useNewAuditWizard(props);
  const variant = props?.variant ?? 'consultant';
  const isClientSelfServe = variant === 'client_self_serve';

  const clientDraftSaveSection = isClientSelfServe ? (
    <div className="mt-5 space-y-3 border-t pt-5">
      {wizard.draftError && (
        <div className="bg-destructive/10 text-destructive border-destructive/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
          <Warning className="w-3.5 h-3.5 flex-shrink-0" />
          {wizard.draftError}
        </div>
      )}
      {wizard.draftNotice && !wizard.draftError && (
        <div className="text-success flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs">
          <CheckCircle weight="fill" className="w-3.5 h-3.5 flex-shrink-0" />
          {wizard.draftNotice}
        </div>
      )}
      <button
        type="button"
        disabled={wizard.draftSaving}
        data-busy={wizard.draftSaving ? 'true' : 'false'}
        onClick={() => {
          void wizard.handleSaveClientDraft();
        }}
        className="ds-new-audit-draft-save-btn"
      >
        {wizard.draftSaving ? (
          <Spinner className="text-info h-4 w-4 animate-spin" />
        ) : (
          <FloppyDisk className="text-info h-4 w-4" />
        )}
        {WORKSPACE_PAGE_COPY.newAudit.draftSaveButton}
      </button>
      <p className="text-muted-foreground m-0 text-center text-xs leading-relaxed">
        {WORKSPACE_PAGE_COPY.newAudit.draftSaveTabNote}
      </p>
    </div>
  ) : null;
  const clientDraftSaveInlineAction = isClientSelfServe ? (
    <button
      type="button"
      disabled={wizard.draftSaving}
      data-busy={wizard.draftSaving ? 'true' : 'false'}
      onClick={() => {
        void wizard.handleSaveClientDraft();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-transparent px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:text-muted-foreground/60"
    >
      {wizard.draftSaving ? (
        <Spinner className="h-4 w-4 animate-spin" />
      ) : (
        <FloppyDisk className="h-4 w-4" />
      )}
      {WORKSPACE_PAGE_COPY.newAudit.draftSaveButton}
    </button>
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
    >
      <div className="bg-background glc-page-content relative flex min-h-full flex-col items-center justify-center py-8 mobile:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[var(--mesh-brand)] opacity-55" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'relative w-full max-w-full',
            wizard.step === 1 ? 'ds-new-audit-wizard-shell--wide' : 'ds-new-audit-wizard-shell--narrow',
          )}
        >
          {isClientSelfServe && (
            <Breadcrumb aria-label={WORKSPACE_PAGE_COPY.marketingLayout.breadcrumbsAriaLabel} className="ds-new-audit-client-breadcrumb">
              <BreadcrumbList className="ds-new-audit-client-breadcrumb-list">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/portal"
                      className="glc-touch-target ds-new-audit-client-breadcrumb-link inline-flex items-center py-[length:var(--space-2)]"
                    >
                      {WORKSPACE_PAGE_COPY.newAudit.breadcrumbPortalParent}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="[&>svg]:text-[var(--text-tertiary)]" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[length:var(--text-sm)] text-[var(--text-tertiary)]">
                    {WORKSPACE_PAGE_COPY.newAudit.appShellTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <StepIndicator
            current={wizard.step}
            onStepClick={step => {
              if (step < wizard.step) {
                wizard.setStep(step);
              }
            }}
          />

          {isClientSelfServe && wizard.draftRestoredVisible && (
            <div className="bg-info/10 border-info/40 mb-5 flex items-start gap-3 rounded-xl border px-4 py-3">
              <ClipboardText className="text-info mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground m-0 text-sm font-medium">
                  {WORKSPACE_PAGE_COPY.newAudit.draftRestoredTitle}
                </p>
                <p className="text-muted-foreground m-0 mt-1 text-xs leading-relaxed">
                  {WORKSPACE_PAGE_COPY.newAudit.draftRestoredBody}
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground flex-shrink-0 rounded-md bg-transparent p-1"
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
                  coverageValid={wizard.coverageValid}
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
                isClientSelfServe={isClientSelfServe}
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
                url={wizard.url}
                name={wizard.name}
                industry={wizard.industry}
                industrySpecify={wizard.industrySpecify}
                step0PipelineAnswerSource={wizard.responseSource}
                intakeAnalytics={wizard.briefWizardIntakeAnalytics}
                onResponsesChange={next => wizard.setResponses(next)}
                onResponseChange={wizard.handleResponseChange}
                onSetUnknown={wizard.handleSetUnknown}
                step2Complete={wizard.step2Complete}
                onBackToStep0={() => wizard.setStep(0)}
                onGoToStep2={() => wizard.setStep(2)}
                clientDraftSaveSection={clientDraftSaveSection}
                clientDraftSaveInlineAction={clientDraftSaveInlineAction}
                briefExecutionDiagnostic={wizard.briefExecutionDiagnostic}
                briefExecutionDiagnosticLoading={wizard.briefExecutionDiagnosticLoading}
                briefExecutionDiagnosticError={wizard.briefExecutionDiagnosticError}
                serverVisibleQuestionIds={wizard.briefWizardServerVisibleQuestionIds}
              />
            )}

            {/* ── Step 2: Review ───────────────────────── */}
            {wizard.step === 2 && (
              <Step2Review
                url={wizard.url}
                name={wizard.name}
                industry={wizard.industry}
                coveragePackage={wizard.coveragePackage!}
                selectedDomains={wizard.selectedDomains}
                answeredRequired={wizard.answeredRequired}
                pipelineRequiredTotal={wizard.pipelineRequiredTotal}
                answeredQuestionIds={wizard.answeredPipelineRequiredIds}
                pipelineGateBriefResponses={wizard.pipelineGateBriefResponses}
                onBackToStep1={() => wizard.setStep(1)}
                onGoToStep3={() => wizard.setStep(3)}
                clientDraftSaveSection={clientDraftSaveSection}
              />
            )}

            {/* ── Step 3: Launch ───────────────────────── */}
            {wizard.step === 3 && (
              <Step3Launch
                error={wizard.error}
                loading={wizard.loading}
                isClientSelfServe={isClientSelfServe}
                consultantDpaLoading={wizard.consultantDpaLoading}
                consultantDpaOnFile={wizard.consultantDpaOnFile}
                consultantDpaChecked={wizard.consultantDpaChecked}
                onConsultantDpaCheckedChange={wizard.setConsultantDpaChecked}
                onBackToStep2={() => wizard.setStep(2)}
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
