import type { CSSProperties } from 'react';

import {
  SNAPSHOT_SCORE_COLORS,
  SNAPSHOT_SCORE_LABELS,
  SnapshotScoreContextNotes,
  SnapshotScoreDonut,
  snapshotDonutFillFromLegacyBand,
  snapshotDonutFillFromOverall,
  snapshotScoreColorFrom100,
} from '../../snapshot/SnapshotScoreKit';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';
import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import type { SnapshotScoreVisualModel } from '../model/portal-snapshot-mirror.types';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';

function ScoreDonut({
  scoreVisual,
  size,
  strokeWidth,
  compact,
}: {
  scoreVisual: SnapshotScoreVisualModel;
  size: number;
  strokeWidth: number;
  compact?: boolean;
}) {
  if (scoreVisual.mode === 'overall') {
    const color = snapshotScoreColorFrom100(scoreVisual.overallScore);
    return (
      <SnapshotScoreDonut
        fillPercent={snapshotDonutFillFromOverall(scoreVisual.overallScore)}
        accentColor={color}
        size={size}
        strokeWidth={strokeWidth}
      >
        <p
          className={`[font-family:var(--font-display)] ds-mirror-score-big-number${compact ? ' ds-mirror-score-big-number--compact' : ''}`}
          style={{ ['--mirror-score-fg' as string]: color } as CSSProperties}
        >
          {scoreVisual.overallScore}
          <span className={`ds-mirror-score-denom${compact ? ' ds-mirror-score-denom--compact' : ''}`}>/100</span>
        </p>
      </SnapshotScoreDonut>
    );
  }
  const c = SNAPSHOT_SCORE_COLORS[scoreVisual.band];
  return (
    <SnapshotScoreDonut
      fillPercent={snapshotDonutFillFromLegacyBand(scoreVisual.band)}
      accentColor={c}
      size={size}
      strokeWidth={strokeWidth}
    >
      <p
        className={`[font-family:var(--font-display)] ds-mirror-score-big-number${compact ? ' ds-mirror-score-big-number--compact' : ''}`}
        style={{ ['--mirror-score-fg' as string]: c } as CSSProperties}
      >
        {scoreVisual.band}/5
      </p>
      <p
        className={`ds-mirror-score-band-label mt-0.5 font-semibold ${compact ? 'text-sm' : 'text-xs sm:text-sm'}`}
        style={{ ['--mirror-label-fg' as string]: c } as CSSProperties}
      >
        {SNAPSHOT_SCORE_LABELS[scoreVisual.band]}
      </p>
    </SnapshotScoreDonut>
  );
}

export function MirrorScoreSection({
  result,
  scoreVisual,
  hasSummary,
}: {
  result: FreeSnapshotPreview;
  scoreVisual: SnapshotScoreVisualModel;
  hasSummary: boolean;
}) {
  if (!hasSummary && typeof result.overall_score !== 'number' && result.ux_label == null && !result.scan_confidence_band) {
    return null;
  }
  if (hasSummary) {
    const preset = PORTAL_SNAPSHOT_MIRROR_CONSTANTS.donutPreset.large;
    return (
      <div className="lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6">
        <div
          className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex min-h-0 flex-col items-center justify-center p-6 text-center lg:col-span-5 lg:mb-0 lg:min-h-[15rem] lg:p-8"
          style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}
        >
          <p className="mb-3 text-xs font-medium" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.scoreEyebrow}>
            {PORTAL_SNAPSHOT_MIRROR_COPY.score.title}
          </p>
          <ScoreDonut scoreVisual={scoreVisual} size={preset.size} strokeWidth={preset.strokeWidth} />
          {result.scan_confidence_band ? (
          <p className="mt-2 text-xs text-[var(--text-quaternary)]">
              {PORTAL_SNAPSHOT_MIRROR_COPY.score.confidencePrefix} {result.scan_confidence_band}
            </p>
          ) : null}
        </div>
        <div className="glc-card glc-snapshot-result-card flex flex-col justify-center p-6 text-left lg:col-span-7 lg:p-8" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral !mb-3">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {PORTAL_SNAPSHOT_MIRROR_COPY.score.summary}
            </span>
          </div>
          <p className="text-pretty text-sm leading-relaxed text-[var(--text-secondary)] lg:text-[0.9375rem]">
            {result.ux_summary}
          </p>
          <SnapshotScoreContextNotes result={result} />
        </div>
      </div>
    );
  }

  const preset = PORTAL_SNAPSHOT_MIRROR_CONSTANTS.donutPreset.compact;
  return (
    <div
      className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex flex-row items-center justify-between p-6 mobile:flex-col mobile:gap-4 mobile:p-5"
      style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}
    >
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 mobile:w-full lg:flex-row lg:items-center lg:justify-center lg:gap-10">
        <div className="flex w-full flex-col items-center text-center mobile:items-center lg:w-auto lg:shrink-0">
          <p className="mb-1 text-xs font-medium lg:sr-only" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.scoreEyebrow}>
            {PORTAL_SNAPSHOT_MIRROR_COPY.score.title}
          </p>
          <ScoreDonut scoreVisual={scoreVisual} size={preset.size} strokeWidth={preset.strokeWidth} compact />
        </div>
        <div className="min-w-0 w-full text-center mobile:text-center lg:flex-1 lg:text-left">
          <p className="mb-2 hidden text-xs font-medium lg:block" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.scoreEyebrow}>
            {PORTAL_SNAPSHOT_MIRROR_COPY.score.title}
          </p>
          {scoreVisual.mode === 'legacy' && scoreVisual.uxLabel ? (
            <p className="text-xs text-[var(--text-tertiary)]">
              {scoreVisual.uxLabel}
            </p>
          ) : null}
          {result.scan_confidence_band ? (
            <p className="mt-2 text-xs text-[var(--text-quaternary)] lg:mt-2">
              {PORTAL_SNAPSHOT_MIRROR_COPY.score.confidencePrefix} {result.scan_confidence_band}
            </p>
          ) : null}
          <SnapshotScoreContextNotes result={result} showTopDivider />
        </div>
      </div>
    </div>
  );
}
