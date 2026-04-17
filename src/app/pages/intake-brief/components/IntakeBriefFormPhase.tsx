import { motion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { BriefField } from '../../../components/BriefField';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { briefResponseTrimmedString } from '../../../data/briefQuestions';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { formatIntakeBriefSavedAt } from '../../../lib/format-intake-dates';
import { replaceIntakePublicCopyPlaceholders } from '../lib/intake-public-copy-helpers';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

type SectionBlock = { section: string; questions: BriefQuestion[] };

export function IntakeBriefFormPhase(props: {
  questionSections: SectionBlock[];
  responses: BriefResponses;
  companyName: string;
  message: string;
  submittedAt: string | null;
  expiresAtIso: string | null;
  consultantPrefilledIdentity: boolean;
  answered: number;
  total: number;
  formComplete: boolean;
  submitError: string | null;
  onFieldChange: (id: string, value: string | string[] | number | null) => void;
  onIndustryChange: (value: string | string[] | number | null) => void;
  onWebsitePresenceChange: (value: string | string[] | number | null) => void;
  onUnknown: (id: string) => void;
  onGoReview: () => void;
}) {
  const {
    questionSections,
    responses,
    companyName,
    message,
    submittedAt,
    expiresAtIso,
    consultantPrefilledIdentity,
    answered,
    total,
    formComplete,
    submitError,
    onFieldChange,
    onIndustryChange,
    onWebsitePresenceChange,
    onUnknown,
    onGoReview,
  } = props;

  const title = companyName || copy.formTitleFallback;
  const expiresDisplay = expiresAtIso ? formatIntakeBriefSavedAt(expiresAtIso) : '';

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full space-y-6"
    >
      <div className="text-center space-y-2">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'var(--text-xl)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h1>
        {message && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        )}
      </div>

      {submittedAt && (
        <p
          className="text-xs text-center px-3 py-2 rounded-lg"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {expiresDisplay
            ? replaceIntakePublicCopyPlaceholders(copy.alreadySubmittedWithExpiry, {
                submittedAt: formatIntakeBriefSavedAt(submittedAt),
                expiresAt: expiresDisplay,
              })
            : replaceIntakePublicCopyPlaceholders(copy.alreadySubmittedResubmit, {
                submittedAt: formatIntakeBriefSavedAt(submittedAt),
              })}
        </p>
      )}

      {consultantPrefilledIdentity && (
        <p
          className="text-xs text-center px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(28,189,255,0.08)',
            border: '1px solid rgba(28,189,255,0.2)',
            color: 'var(--text-secondary)',
          }}
        >
          {copy.consultantPrefillNotice}
        </p>
      )}
      <p
        className="text-xs text-center px-3 py-2 rounded-lg"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        {copy.shortAnswersHint}
      </p>

      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
          <span>{copy.progressLabel}</span>
          <span>
            {answered} / {total}
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${total ? (answered / total) * 100 : 0}%`,
              background: 'var(--gradient-brand)',
            }}
          />
        </div>
      </div>

      <div className="glc-card overflow-hidden p-5 space-y-8" style={{ borderRadius: 'var(--radius-xl)' }}>
        {questionSections.map((block, blockIdx) => (
          <section
            key={`intake-form-section-${blockIdx}`}
            className="space-y-6"
            aria-labelledby={`intake-section-${blockIdx}`}
          >
            <h2
              id={`intake-section-${blockIdx}`}
              className="text-[11px] font-semibold uppercase tracking-[0.12em] m-0 pb-1"
              style={{
                color: 'var(--text-quaternary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {block.section}
            </h2>
            <div className="space-y-6">
              {block.questions.map(q => {
                const specKey =
                  q.id === 'a2'
                    ? null
                    : q.type === 'single_choice' || q.type === 'multi_choice'
                      ? `${q.id}__other`
                      : null;
                const otherSpecify =
                  q.id === 'a2'
                    ? briefResponseTrimmedString(responses.intake_industry_specify)
                    : specKey
                      ? briefResponseTrimmedString(responses[specKey])
                      : '';
                return (
                  <div key={q.id} id={`intake-q-${q.id}`}>
                    <BriefField
                      q={q}
                      value={responses[q.id]}
                      onChange={
                        q.id === 'a2'
                          ? v => onIndustryChange(v)
                          : q.id === 'a5'
                            ? v => onWebsitePresenceChange(v)
                            : v => onFieldChange(q.id, v)
                      }
                      onSetUnknown={() => onUnknown(q.id)}
                      otherSpecify={q.id === 'a2' || specKey ? otherSpecify : undefined}
                      onOtherSpecifyChange={
                        q.id === 'a2'
                          ? text => onFieldChange('intake_industry_specify', text || null)
                          : specKey
                            ? text => onFieldChange(specKey, text || null)
                            : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {submitError && (
        <p className="text-sm text-center" style={{ color: 'var(--score-1)' }}>
          {submitError}
        </p>
      )}

      <button
        type="button"
        disabled={!formComplete}
        className="w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
        style={{
          background: formComplete ? 'var(--gradient-brand)' : 'var(--bg-muted)',
          color: formComplete ? 'var(--primary-foreground)' : 'var(--text-secondary)',
          border: formComplete ? 'none' : '1px solid var(--border-subtle)',
          cursor: formComplete ? 'pointer' : 'not-allowed',
        }}
        onClick={onGoReview}
      >
        {copy.reviewAnswers} <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
