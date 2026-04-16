import { useEffect, type RefObject } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ChartBar, CheckCircle } from '@phosphor-icons/react';
import { choiceValueNeedsSpecify } from '@glc/intake-core';
import type { DiscoveryAnswers, DiscoveryQuestion } from '../../../lib/discovery-flow';
import discoveryUiCopy from '../../../data/discovery-ui-copy.en.json';
import { DISCOVER_QUESTION_SCROLL_DELAY_MS } from '../../../config/discover-page-defaults';
import { QuestionInput } from './QuestionInput';
import { summariseAnswer } from '../services';
import { DISCOVER_PAGE_UI } from '../config';

type DiscoverQuestionnaireViewProps = {
  isSplit: boolean;
  currentIdx: number;
  sequence: string[];
  answeredIds: string[];
  currentId: string | null;
  currentQuestion: DiscoveryQuestion | null;
  answers: DiscoveryAnswers;
  draft: DiscoveryAnswers[string];
  canAdvance: boolean;
  allDone: boolean;
  showResults: boolean;
  bottomRef: RefObject<HTMLDivElement>;
  getQuestionById: (id: string) => DiscoveryQuestion | undefined;
  onDraftChange: (value: DiscoveryAnswers[string]) => void;
  onSpecifyChange: (questionId: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onShowResults: () => void;
};

export function DiscoverQuestionnaireView(props: DiscoverQuestionnaireViewProps) {
  const {
    isSplit,
    currentIdx,
    sequence,
    answeredIds,
    currentId,
    currentQuestion,
    answers,
    draft,
    canAdvance,
    allDone,
    showResults,
    bottomRef,
    getQuestionById,
    onDraftChange,
    onSpecifyChange,
    onNext,
    onBack,
    onShowResults,
  } = props;

  useEffect(() => {
    if (!showResults) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, DISCOVER_QUESTION_SCROLL_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [bottomRef, currentIdx, showResults]);

  return (
    <div
      className={
        isSplit
          ? 'w-full min-w-0 max-w-full'
          : 'min-h-screen flex flex-col items-center py-10 px-5'
      }
      style={{ background: isSplit ? 'transparent' : 'var(--bg-canvas)' }}
    >
      {!isSplit && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'var(--mesh-brand)', zIndex: 0 }}
          aria-hidden
        />
      )}

      <div className={`relative z-10 w-full min-w-0 ${isSplit ? 'max-w-full' : 'max-w-lg'}`}>
        <div className={`flex items-center justify-between ${isSplit ? 'mb-6' : 'mb-8'}`}>
          {!isSplit && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
                <ChartBar size={16} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                GLC Audit
              </span>
            </div>
          )}
          {isSplit && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {discoveryUiCopy.wizardHeader.answersLabel}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {currentIdx + 1} / {sequence.length}
          </span>
        </div>

        <div className={`rounded-full overflow-hidden ${isSplit ? 'mb-6' : 'mb-8'}`} style={{ height: 2, background: 'var(--bg-muted)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-brand)' }}
            animate={{ width: `${((currentIdx + (canAdvance ? 1 : 0)) / sequence.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {!isSplit && currentIdx === 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              {discoveryUiCopy.wizardHeader.introTitle}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              {discoveryUiCopy.wizardHeader.introSubtitle.replace('{{count}}', String(sequence.length))}
            </p>
          </motion.div>
        )}

        {answeredIds.length > 0 && (
          <div className="space-y-2 mb-5">
            {answeredIds.map(id => {
              const question = getQuestionById(id);
              if (!question) return null;
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <CheckCircle size={14} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: 1 }}>{question.question}</p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {summariseAnswer(answers[id], id, answers)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentQuestion && currentId && (
          <motion.div
            key={currentId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid color-mix(in oklab, var(--glc-blue) 12%, var(--border-subtle))',
              boxShadow: '0 4px 24px rgba(11,17,32,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{ width: 20, height: 20, background: 'var(--gradient-brand)', color: 'var(--primary-foreground)' }}
              >
                {currentIdx + 1}
              </span>
              {currentQuestion.type === 'multi_choice' && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                  {DISCOVER_PAGE_UI.questionnaire.multiChoiceHintLabel}
                </span>
              )}
            </div>

            <label className="block font-semibold" style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentQuestion.question}
            </label>

            {currentQuestion.hint && (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: -4 }}>
                {currentQuestion.hint}
              </p>
            )}

            <QuestionInput
              qId={currentId}
              value={draft}
              onChange={value => {
                onDraftChange(value);
                if (!choiceValueNeedsSpecify(value)) onSpecifyChange(currentId, '');
              }}
              specifyValue={typeof answers[`${currentId}__other`] === 'string' ? (answers[`${currentId}__other`] as string) : ''}
              onSpecifyChange={text => onSpecifyChange(currentId, text)}
            />

            <div className="flex items-center gap-3 pt-1">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    color: 'var(--text-tertiary)',
                    background: 'transparent',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <ArrowLeft size={14} /> {DISCOVER_PAGE_UI.questionnaire.backButtonLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                disabled={!canAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100"
                style={{
                  background: canAdvance
                    ? 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-deeper) 100%)'
                    : 'linear-gradient(135deg, color-mix(in oklab, var(--glc-blue) 72%, var(--bg-muted)) 0%, color-mix(in oklab, var(--glc-blue-deeper) 66%, var(--bg-muted)) 100%)',
                  color: canAdvance ? 'var(--primary-foreground)' : 'color-mix(in oklab, var(--primary-foreground) 76%, transparent)',
                  border: canAdvance ? 'none' : '1px solid color-mix(in oklab, var(--glc-blue) 34%, var(--border-default))',
                  cursor: canAdvance ? 'pointer' : 'not-allowed',
                  boxShadow: canAdvance
                    ? '0 6px 18px color-mix(in oklab, var(--glc-blue) 34%, transparent)'
                    : '0 3px 10px color-mix(in oklab, var(--glc-blue) 20%, transparent)',
                }}
              >
                {currentIdx < sequence.length - 1 ? (
                  <>
                    {DISCOVER_PAGE_UI.questionnaire.continueButtonLabel} <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    {DISCOVER_PAGE_UI.questionnaire.seeFindingsButtonLabel} <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {allDone && !showResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <button
              type="button"
              onClick={onShowResults}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer' }}
            >
              <CheckCircle size={16} /> {DISCOVER_PAGE_UI.questionnaire.viewFindingsButtonLabel}
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />
        {!isSplit && (
          <p className="text-center mt-8" style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
            {discoveryUiCopy.wizardHeader.footerLabel}
          </p>
        )}
      </div>
    </div>
  );
}
