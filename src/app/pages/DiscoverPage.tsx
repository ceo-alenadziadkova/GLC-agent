import {
  DiscoverQuestionnaireView,
  DiscoverResultsView,
  useDiscoverController,
} from './discover';

export type DiscoverPageProps = {
  layout?: 'page' | 'split';
  /** When embedded in marketing split layout, parent sets true while results are visible so the column can go full width. */
  embedExpanded?: boolean;
  /** Called when the wizard finishes (expand) or user leaves results in split mode (collapse). */
  onEmbedExpandRequest?: (expanded: boolean) => void;
};

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoverPage(props?: DiscoverPageProps) {
  const layout = props?.layout ?? 'page';
  const isSplit = layout === 'split';
  const embedExpanded = props?.embedExpanded ?? false;
  const onEmbedExpandRequest = props?.onEmbedExpandRequest;
  const controller = useDiscoverController({
    isSplit,
    onEmbedExpandRequest,
  });

  if (controller.showResults) {
    return (
      <DiscoverResultsView
        isSplit={isSplit}
        embedExpanded={embedExpanded}
        findings={controller.findings}
        industry={controller.industry}
        teamSize={controller.teamSize}
        signalCount={controller.signalCount}
        sessionToken={controller.sessionToken}
        contactName={controller.contactName}
        contactEmail={controller.contactEmail}
        contactPhone={controller.contactPhone}
        contactCompany={controller.contactCompany}
        contactSaving={controller.contactSaving}
        contactSaved={controller.contactSaved}
        contactError={controller.contactError}
        onContactNameChange={controller.setContactName}
        onContactEmailChange={controller.setContactEmail}
        onContactPhoneChange={controller.setContactPhone}
        onContactCompanyChange={controller.setContactCompany}
        onContactSubmit={controller.handleContactSubmit}
        onBack={controller.handleBack}
      />
    );
  }

  return (
    <DiscoverQuestionnaireView
      isSplit={isSplit}
      currentIdx={controller.currentIdx}
      sequence={controller.sequence}
      answeredIds={controller.answeredIds}
      currentId={controller.currentId}
      currentQuestion={controller.currentQuestion}
      answers={controller.answers}
      draft={controller.draft}
      canAdvance={controller.canAdvance}
      allDone={controller.allDone}
      showResults={controller.showResults}
      bottomRef={controller.bottomRef}
      getQuestionById={controller.getQuestionById}
      onDraftChange={controller.handleDraftChange}
      onSpecifyChange={controller.handleSpecifyChange}
      onNext={() => {
        void controller.handleNext();
      }}
      onBack={controller.handleBack}
      onShowResults={controller.handleShowResults}
    />
  );
}
