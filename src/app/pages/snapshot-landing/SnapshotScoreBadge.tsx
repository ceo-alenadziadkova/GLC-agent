import { SnapshotScoreDonut } from './SnapshotScoreDonut';
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
          overallFontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          overallSpanFontSize: '0.45em',
          bandLabelClassName: 'mt-0.5 text-xs font-semibold sm:text-sm',
        }
      : {
          size: 148,
          strokeWidth: 10,
          overallFontSize: 'var(--text-3xl)',
          overallSpanFontSize: '0.5em',
          bandLabelClassName: 'mt-0.5 text-sm font-semibold',
        };

  if (typeof overallScore === 'number') {
    const fillPercent = donutFillFromOverall(overallScore);
    const accentColor = scoreColorFrom100(overallScore);

    return (
      <SnapshotScoreDonut fillPercent={fillPercent} accentColor={accentColor} size={cfg.size} strokeWidth={cfg.strokeWidth}>
        <p
          style={{
            fontSize: cfg.overallFontSize,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: accentColor,
            lineHeight: 1.05,
          }}
        >
          {overallScore}
          <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: cfg.overallSpanFontSize }}>/100</span>
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
        style={{
          fontSize: cfg.overallFontSize,
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color: accentColor,
          lineHeight: 1.05,
        }}
      >
        {band}/5
      </p>
      <p className={cfg.bandLabelClassName} style={{ color: accentColor }}>
        {SCORE_LABELS[band]}
      </p>
    </SnapshotScoreDonut>
  );
}

