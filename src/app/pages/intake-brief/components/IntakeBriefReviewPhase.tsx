import { motion } from 'motion/react';
import { ArrowRight, PencilSimple } from '@phosphor-icons/react';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { formatBriefAnswerSummary } from '../../../data/briefQuestions';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

type SectionBlock = { section: string; questions: BriefQuestion[] };

export function IntakeBriefReviewPhase(props: {
  questionSections: SectionBlock[];
  responses: BriefResponses;
  submitError: string | null;
  submitting: boolean;
  onBackToForm: () => void;
  onEditQuestion: (id: string) => void;
  onConfirmSubmit: () => void;
}) {
  const {
    questionSections,
    responses,
    submitError,
    submitting,
    onBackToForm,
    onEditQuestion,
    onConfirmSubmit,
  } = props;

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full space-y-5"
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
          {copy.reviewTitle}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {copy.reviewSubtitle}
        </p>
      </div>

      <button
        type="button"
        className="text-sm font-medium"
        style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={onBackToForm}
      >
        {copy.backToQuestions}
      </button>

      <div
        className="glc-card overflow-hidden"
        style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
      >
        {questionSections.map((block, blockIdx) => (
          <div
            key={`intake-review-section-${blockIdx}`}
            className={blockIdx > 0 ? 'border-t' : ''}
            style={blockIdx > 0 ? { borderColor: 'var(--border-subtle)' } : undefined}
          >
            <div
              className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--bg-muted)',
                color: 'var(--text-quaternary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {block.section}
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {block.questions.map(q => (
                <div key={q.id} className="flex gap-3 px-4 py-3.5 items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      {q.question}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatBriefAnswerSummary(q, responses[q.id], responses)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${copy.editAriaPrefix} ${q.question}`}
                    className="shrink-0 p-2 rounded-lg"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--glc-blue)',
                      background: 'var(--bg-surface)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onEditQuestion(q.id)}
                  >
                    <PencilSimple className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {submitError && (
        <p className="text-sm text-center" style={{ color: 'var(--score-1)' }}>
          {submitError}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
        style={{
          background: !submitting ? 'var(--gradient-brand)' : 'var(--bg-muted)',
          color: !submitting ? 'var(--primary-foreground)' : 'var(--text-secondary)',
          border: !submitting ? 'none' : '1px solid var(--border-subtle)',
          cursor: submitting ? 'wait' : 'pointer',
        }}
        onClick={() => {
          void onConfirmSubmit();
        }}
      >
        {submitting ? (
          copy.sending
        ) : (
          <>
            {copy.confirmSubmit} <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}
