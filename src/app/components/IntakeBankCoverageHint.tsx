import type { CSSProperties } from 'react';

export interface IntakeBankCoverageHintProps {
  dataQualityPct: number;
  visibleRequiredAnswered: number;
  visibleRequiredTotal: number;
  visibleRecommendedAnswered: number;
  visibleRecommendedTotal: number;
  /** Domains where SLA-visible primary bank questions are still unanswered (`missingForReport`). */
  reportInputGapLabels?: string[];
  className?: string;
  style?: CSSProperties;
}

/** Branch-aware question bank v1 coverage (matches server `calcDataQualityScore` on merged responses). */
export function IntakeBankCoverageHint({
  dataQualityPct,
  visibleRequiredAnswered,
  visibleRequiredTotal,
  visibleRecommendedAnswered,
  visibleRecommendedTotal,
  reportInputGapLabels,
  className = '',
  style,
}: IntakeBankCoverageHintProps) {
  const gapPreview =
    reportInputGapLabels && reportInputGapLabels.length > 0
      ? (() => {
          const max = 5;
          const head = reportInputGapLabels.slice(0, max).join(' · ');
          const more = reportInputGapLabels.length > max ? ` · +${reportInputGapLabels.length - max} more` : '';
          return head + more;
        })()
      : null;
  return (
    <div
      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-secondary)] ${className}`}
      style={{
        ...style,
      }}
      title="Branch-aware question bank v1 coverage (docs/QUESTION_BANK.md). Legacy field answers map into bank ids for agents automatically."
    >
      <span className="font-semibold text-[var(--text-primary)]">Question bank coverage</span>
      {' '}
      {dataQualityPct}%
      <span className="ml-1.5 text-[var(--text-tertiary)]">
        ({visibleRequiredAnswered}/{visibleRequiredTotal} visible required
        {visibleRecommendedTotal > 0
          ? `, ${visibleRecommendedAnswered}/${visibleRecommendedTotal} recommended`
          : ''}
        )
      </span>
      {gapPreview && (
        <div
          className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[var(--text-tertiary)] leading-[1.45]"
        >
          <span className="font-semibold text-[var(--text-secondary)]">Report input gaps: </span>
          {gapPreview}
        </div>
      )}
    </div>
  );
}
