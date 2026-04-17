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
import { cn } from '../../../components/ui/utils';
import { Progress } from '../../../components/ui/progress';

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
    <div className={isSplit ? 'w-full min-w-0 max-w-full' : 'bg-background min-h-screen flex flex-col items-center px-5 py-10'}>
      {!isSplit && (
        <div
          className="ds-bg-fill-mesh-brand fixed inset-0 z-0 pointer-events-none"
          aria-hidden
        />
      )}

      <div className={`relative z-10 w-full min-w-0 ${isSplit ? 'max-w-full' : 'max-w-lg'}`}>
        <div className={`flex items-center justify-between ${isSplit ? 'mb-6' : 'mb-8'}`}>
          {!isSplit && (
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-sky-400 to-sky-600 flex h-7 w-7 items-center justify-center rounded-lg">
                <ChartBar size={16} weight="bold" className="text-primary-foreground" />
              </div>
              <span className="text-foreground text-[length:var(--text-base)] font-bold tracking-[var(--tracking-discover-results-brand)]">
                GLC Audit
              </span>
            </div>
          )}
          {isSplit && (
            <span className="text-foreground text-[length:var(--text-sm)] font-semibold">
              {discoveryUiCopy.wizardHeader.answersLabel}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {currentIdx + 1} / {sequence.length}
          </span>
        </div>

        <Progress
          value={((currentIdx + (canAdvance ? 1 : 0)) / sequence.length) * 100}
          className={cn(
            'h-[length:var(--discover-progress-track-height)] bg-muted [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-sky-400 [&>[data-slot=progress-indicator]]:to-sky-600',
            isSplit ? 'mb-6' : 'mb-8',
          )}
        />

        {!isSplit && currentIdx === 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
            <h1 className="text-foreground text-[length:var(--discover-wizard-intro-title-size)] font-extrabold leading-[1.3] tracking-[var(--tracking-tight)]">
              {discoveryUiCopy.wizardHeader.introTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-[length:var(--text-sm)] leading-[1.6]">
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
                  className="bg-card flex items-start gap-3 rounded-xl border px-3 py-2.5"
                >
                  <CheckCircle size={14} weight="fill" className="text-success mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground mb-0.5 text-xs">{question.question}</p>
                    <p className="text-muted-foreground truncate text-xs">
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
            className="bg-card border-info/20 space-y-3 rounded-2xl border p-5 shadow-[var(--shadow-discover-question-card)]"
          >
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-sky-400 to-sky-600 text-primary-foreground inline-flex h-5 w-5 items-center justify-center rounded-full text-[length:var(--text-2xs)] font-bold">
                {currentIdx + 1}
              </span>
              {currentQuestion.type === 'multi_choice' && (
                <span className="text-muted-foreground text-[length:var(--text-2xs)] tracking-[var(--tracking-wide)]">
                  {DISCOVER_PAGE_UI.questionnaire.multiChoiceHintLabel}
                </span>
              )}
            </div>

            <label className="text-foreground block text-[length:var(--text-base)] font-semibold leading-[1.4]">
              {currentQuestion.question}
            </label>

            {currentQuestion.hint && (
              <p className="text-muted-foreground -mt-1 text-xs">
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
                  className="text-muted-foreground flex items-center gap-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
                >
                  <ArrowLeft size={14} /> {DISCOVER_PAGE_UI.questionnaire.backButtonLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                disabled={!canAdvance}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100',
                  canAdvance
                    ? 'bg-gradient-to-r from-sky-400 to-sky-600 text-primary-foreground shadow-[var(--shadow-discover-cta-active)]'
                    : 'bg-gradient-to-r from-sky-400/70 to-sky-700/70 text-primary-foreground/80 cursor-not-allowed border border-info/35 shadow-[var(--shadow-discover-cta-muted)]',
                )}
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
              className="text-primary-foreground inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-6 py-3 text-sm font-semibold"
            >
              <CheckCircle size={16} /> {DISCOVER_PAGE_UI.questionnaire.viewFindingsButtonLabel}
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />
        {!isSplit && (
          <p className="text-muted-foreground mt-8 text-center text-xs">
            {discoveryUiCopy.wizardHeader.footerLabel}
          </p>
        )}
      </div>
    </div>
  );
}
