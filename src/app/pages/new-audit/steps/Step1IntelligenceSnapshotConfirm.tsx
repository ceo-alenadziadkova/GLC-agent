import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Spinner } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { getQuestionLabel } from '../../../lib/intake-question-lookup';
import { cn } from '../../../components/ui/utils';

const copy = WORKSPACE_PAGE_COPY.newAudit.step1.intelligenceSnapshot;

export type Step1IntelligenceSnapshotPayload = {
  narrative: string | null;
  merge_would_apply_count: number;
  inferred_preview: Array<{
    questionId: string;
    confidence: 'low' | 'medium';
    rationale: string;
    suggestedValue: string | boolean;
  }>;
  label_overrides: Record<string, string>;
  f2_source: 'llm' | 'deterministic' | 'llm_mixed';
};

type Step1IntelligenceSnapshotConfirmProps = {
  payload: Step1IntelligenceSnapshotPayload;
  onBackToQuestions: () => void;
  onContinue: (selectedMediumQuestionIds: Set<string>) => void | Promise<void>;
  continuePending: boolean;
  /** After identity-only snapshot — button copy skips LLM-2 wording promise. */
  confirmPhase?: 'standard' | 'early';
};

export function Step1IntelligenceSnapshotConfirm({
  payload,
  onBackToQuestions,
  onContinue,
  continuePending,
  confirmPhase = 'standard',
}: Step1IntelligenceSnapshotConfirmProps) {
  const [selectedInferred, setSelectedInferred] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedInferred(
      new Set(
        payload.inferred_preview.filter(r => r.confidence === 'medium' || r.confidence === 'low').map(r => r.questionId),
      ),
    );
  }, [payload.inferred_preview]);

  const hasNarrative = Boolean(payload.narrative && payload.narrative.trim().length > 0);
  const hasInferred = payload.inferred_preview.length > 0;
  const hasLabels = Object.keys(payload.label_overrides).length > 0;
  const emptyCard = !hasNarrative && !hasInferred && payload.merge_would_apply_count === 0;
  const hasSelectableInferred = payload.inferred_preview.some(
    r => r.confidence === 'medium' || r.confidence === 'low',
  );
  const isEarly = confirmPhase === 'early';

  return (
    <div className="ds-new-audit-step1-intel-confirm space-y-5">
      <div>
        <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--text-primary)]">{copy.title}</h2>
        <p className="text-muted-foreground mt-2 m-0 max-w-2xl text-sm leading-relaxed">
          {isEarly ? copy.subtitleEarly : copy.subtitle}
        </p>
        <p className="text-muted-foreground/90 mt-2 m-0 max-w-2xl text-xs leading-relaxed">
          {isEarly ? copy.continueToReviewSubtextEarly : copy.continueToReviewSubtext}
        </p>
      </div>

      <div className="bg-card border-border/80 space-y-4 rounded-xl border p-4 sm:p-5">
        {hasNarrative ? (
          <div>
            <p className="text-muted-foreground m-0 mb-1 text-xs font-medium uppercase tracking-wide">
              {copy.narrativeLabel}
            </p>
            <p className="text-foreground m-0 text-sm leading-relaxed whitespace-pre-wrap">{payload.narrative}</p>
          </div>
        ) : null}

        {emptyCard ? (
          <p className="text-muted-foreground m-0 text-sm">{copy.noNarrativeNoMerge}</p>
        ) : null}

        {hasInferred ? (
          <div>
            <p className="text-muted-foreground m-0 mb-2 text-xs font-medium uppercase tracking-wide">
              {copy.mergePreviewLabel}
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
              {payload.inferred_preview.map(row => (
                <li
                  key={`${row.questionId}-${row.rationale.slice(0, 24)}`}
                  className="bg-muted/25 border-border/60 rounded-lg border px-3 py-2 text-sm"
                >
                  {row.confidence === 'medium' || row.confidence === 'low' ? (
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedInferred.has(row.questionId)}
                        onChange={e => {
                          const on = e.target.checked;
                          setSelectedInferred(prev => {
                            const n = new Set(prev);
                            if (on) n.add(row.questionId);
                            else n.delete(row.questionId);
                            return n;
                          });
                        }}
                        disabled={continuePending}
                      />
                      <span className="min-w-0 flex-1">
                        <p className="m-0 font-medium text-foreground">
                          {getQuestionLabel(row.questionId)}{' '}
                          <span className="text-xs text-muted-foreground">({row.confidence})</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 m-0 text-xs">{row.rationale}</p>
                        <p className="text-foreground/90 mt-1 m-0 text-xs">
                          <span className="text-muted-foreground">Preview: </span>
                          {typeof row.suggestedValue === 'boolean'
                            ? (row.suggestedValue ? 'Yes' : 'No')
                            : row.suggestedValue}
                        </p>
                      </span>
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
            {hasSelectableInferred ? (
              <p className="text-muted-foreground mt-2 m-0 text-xs">
                {copy.mergeCountLabel.replace('{{count}}', String(selectedInferred.size))}
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 m-0 text-xs">
                {copy.mergeCountLabel.replace('{{count}}', String(payload.merge_would_apply_count))}
              </p>
            )}
          </div>
        ) : !emptyCard && payload.merge_would_apply_count === 0 ? (
          <p className="text-muted-foreground m-0 text-sm">{copy.mergePreviewEmpty}</p>
        ) : null}

        <p className="text-muted-foreground m-0 text-xs">
          {copy.f2SourceLabel}: <span className="text-foreground font-medium">{payload.f2_source}</span>
        </p>

        {hasLabels ? (
          <div>
            <p className="text-muted-foreground m-0 mb-1 text-xs font-medium uppercase tracking-wide">
              {copy.paraphrasePreviewLabel}
            </p>
            <ul className="m-0 list-none space-y-1 p-0 text-sm">
              {Object.entries(payload.label_overrides).map(([id, text]) => (
                <li key={id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="text-muted-foreground min-w-0 flex-shrink-0 text-xs sm:w-40">{id}</span>
                  <span className="text-foreground min-w-0">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <button
          type="button"
          onClick={onBackToQuestions}
          className="text-muted-foreground glc-touch-target order-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-transparent px-3 py-2 text-sm sm:order-1 sm:justify-start"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {copy.backToQuestions}
        </button>
        <div className="order-1 flex-1 sm:order-2 sm:flex sm:justify-end">
          <button
            type="button"
            disabled={continuePending}
            onClick={() => {
              void onContinue(new Set(selectedInferred));
            }}
            className={cn(
              'glc-touch-target flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
              'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)] ring-1 ring-primary/20',
              continuePending && 'opacity-80',
            )}
          >
            {continuePending ? <Spinner className="h-4 w-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {continuePending ? (isEarly ? copy.wordingLoadingEarly : copy.wordingLoading) : isEarly ? copy.continueToReviewEarly : copy.continueToReview}
          </button>
        </div>
      </div>
    </div>
  );
}
