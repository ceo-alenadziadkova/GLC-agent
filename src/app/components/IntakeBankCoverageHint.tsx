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
      className={`px-3 py-2 rounded-lg text-xs ${className}`}
      style={{
        background: 'var(--bg-muted)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)',
        ...style,
      }}
      title="Branch-aware question bank v1 coverage (docs/QUESTION_BANK.md). Legacy field answers map into bank ids for agents automatically."
    >
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Question bank coverage</span>
      {' '}
      {dataQualityPct}%
      <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
        ({visibleRequiredAnswered}/{visibleRequiredTotal} visible required
        {visibleRecommendedTotal > 0
          ? `, ${visibleRecommendedAnswered}/${visibleRecommendedTotal} recommended`
          : ''}
        )
      </span>
      {gapPreview && (
        <div
          className="mt-2 pt-2"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', lineHeight: 1.45 }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Report input gaps: </span>
          {gapPreview}
        </div>
      )}
    </div>
  );
}
