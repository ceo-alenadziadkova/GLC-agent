import type { CSSProperties } from 'react';

export interface IntakeBankCoverageHintProps {
  dataQualityPct: number;
  visibleRequiredAnswered: number;
  visibleRequiredTotal: number;
  visibleRecommendedAnswered: number;
  visibleRecommendedTotal: number;
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
  className = '',
  style,
}: IntakeBankCoverageHintProps) {
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
    </div>
  );
}
