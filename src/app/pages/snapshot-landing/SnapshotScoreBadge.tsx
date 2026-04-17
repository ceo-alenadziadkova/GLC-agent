import type { CSSProperties } from 'react';
import { SnapshotScoreDonut } from '../../components/snapshot/SnapshotScoreDonut';
import {
  SCORE_COLORS,
  SCORE_LABELS,
  donutFillFromLegacyBand,
  donutFillFromOverall,
  legacyUxBand,
  scoreColorFrom100,
} from '../../lib/snapshot-landing-helpers';

export type SnapshotScoreBadgeVariant = 'bento' | 'compact';

export function SnapshotScoreBadge(props: {
  variant: SnapshotScoreBadgeVariant;
  overallScore: number | null;
  uxScore: number | null;
}) {
  const { variant, overallScore, uxScore } = props;

  const cfg =
    variant === 'bento'
      ? {
          size: 180,
          strokeWidth: 12,
          scoreValueClassName: 'ds-snapshot-badge-score-value--bento',
          denomClassName: 'ds-snapshot-badge-denom--bento',
          bandLabelClassName: 'mt-0.5 text-xs font-semibold sm:text-sm',
        }
      : {
          size: 148,
          strokeWidth: 10,
          scoreValueClassName: 'ds-snapshot-badge-score-value--compact',
          denomClassName: 'ds-snapshot-badge-denom--compact',
          bandLabelClassName: 'mt-0.5 text-sm font-semibold',
        };

  if (typeof overallScore === 'number') {
    const fillPercent = donutFillFromOverall(overallScore);
    const accentColor = scoreColorFrom100(overallScore);

    return (
      <SnapshotScoreDonut fillPercent={fillPercent} accentColor={accentColor} size={cfg.size} strokeWidth={cfg.strokeWidth}>
        <p
          className={`ds-snapshot-badge-score-value ${cfg.scoreValueClassName}`}
          style={{ ['--mirror-score-fg' as string]: accentColor } as CSSProperties}
        >
          {overallScore}
          <span className={`ds-snapshot-badge-denom ${cfg.denomClassName}`}>/100</span>
        </p>
      </SnapshotScoreDonut>
    );
  }

  if (typeof uxScore !== 'number') return null;

  const band = legacyUxBand(uxScore);
  const accentColor = SCORE_COLORS[band];

  return (
    <SnapshotScoreDonut
      fillPercent={donutFillFromLegacyBand(band)}
      accentColor={accentColor}
      size={cfg.size}
      strokeWidth={cfg.strokeWidth}
    >
      <p
        className={`ds-snapshot-badge-score-value ${cfg.scoreValueClassName}`}
        style={{ ['--mirror-score-fg' as string]: accentColor } as CSSProperties}
      >
        {band}/5
      </p>
      <p
        className={`ds-mirror-score-band-label ${cfg.bandLabelClassName}`}
        style={{ ['--mirror-label-fg' as string]: accentColor } as CSSProperties}
      >
        {SCORE_LABELS[band]}
      </p>
    </SnapshotScoreDonut>
  );
}
