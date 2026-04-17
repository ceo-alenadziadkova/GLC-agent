import { AnimatePresence } from 'motion/react';
import { useParams } from 'react-router';
import { IntakeBriefShell } from './components/IntakeBriefShell';
import { IntakeBriefHeader } from './components/IntakeBriefHeader';
import { IntakeBriefLoading } from './components/IntakeBriefLoading';
import { IntakeBriefExpired } from './components/IntakeBriefExpired';
import { IntakeBriefLoadError } from './components/IntakeBriefLoadError';
import { IntakeBriefFormPhase } from './components/IntakeBriefFormPhase';
import { IntakeBriefReviewPhase } from './components/IntakeBriefReviewPhase';
import { IntakeBriefSuccessPhase } from './components/IntakeBriefSuccessPhase';
import { useIntakeBriefController } from './hooks/useIntakeBriefController';

export function IntakeBrief() {
  const { token: rawToken } = useParams<{ token: string }>();
  const c = useIntakeBriefController(rawToken);

  return (
    <IntakeBriefShell>
      <IntakeBriefHeader />
      <main
        className="relative z-10 flex-1 flex flex-col items-center px-6 py-10"
        style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}
      >
        {c.loading && <IntakeBriefLoading />}

        {!c.loading && c.expired && <IntakeBriefExpired />}

        {!c.loading && c.loadError && !c.expired && <IntakeBriefLoadError message={c.loadError} />}

        {!c.loading && !c.loadError && !c.expired && (
          <AnimatePresence mode="wait">
            {c.phase === 'success' && c.lastSubmittedIso ? (
              <IntakeBriefSuccessPhase
                lastSubmittedIso={c.lastSubmittedIso}
                successIsUpdate={c.successIsUpdate}
                clientMeta={c.clientMeta}
                consultantLabel={c.consultantLabel}
                followUpLine={c.followUpLine}
                contactFooter={c.contactFooter}
              />
            ) : c.phase === 'review' ? (
              <IntakeBriefReviewPhase
                questionSections={c.questionSections}
                responses={c.responses}
                submitError={c.submitError}
                submitting={c.submitting}
                onBackToForm={() => c.setPhase('form')}
                onEditQuestion={c.scrollToQuestion}
                onConfirmSubmit={c.confirmSubmit}
              />
            ) : (
              <IntakeBriefFormPhase
                questionSections={c.questionSections}
                responses={c.responses}
                companyName={c.companyName}
                message={c.message}
                submittedAt={c.submittedAt}
                expiresAtIso={c.expiresAtIso}
                consultantPrefilledIdentity={c.consultantPrefilledIdentity}
                answered={c.answered}
                total={c.total}
                formComplete={c.formComplete}
                submitError={c.submitError}
                onFieldChange={c.onFieldChange}
                onIndustryChange={c.onIndustryChange}
                onWebsitePresenceChange={c.onWebsitePresenceChange}
                onUnknown={c.onUnknown}
                onGoReview={() => c.setPhase('review')}
              />
            )}
          </AnimatePresence>
        )}
      </main>
    </IntakeBriefShell>
  );
}
