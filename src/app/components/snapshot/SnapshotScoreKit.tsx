/**
 * Shared snapshot score visuals (portal mirror + parity with SnapshotLanding).
 */

import type { CSSProperties } from 'react';
import { Info } from '@phosphor-icons/react';
import { SCORE_COLORS, SCORE_LABELS } from '@glc/intake-core';
import type { FreeSnapshotPreview, SnapshotSiteProfile } from '../../data/auditTypes';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { scanConfidenceExplanation, snapshotZeroPagesScoreNote } from '../../lib/snapshot-diagnostics';
import {
  fivePointBandExplanation,
  legacyUxBand,
  scoreColorFrom100,
} from '../../lib/snapshot-landing-helpers';
import { SNAPSHOT_LANDING_CATEGORY_HINTS } from '../../config/snapshot-landing-copy.en';
import type { SnapshotCategoryScoreKey } from '../../config/snapshot-landing-copy.en';

export type { SnapshotCategoryScoreKey };

const SNAPSHOT_CATEGORY_BREAKDOWN_HINTS = SNAPSHOT_LANDING_CATEGORY_HINTS;

export const SNAPSHOT_SCORE_COLORS = SCORE_COLORS;
export const SNAPSHOT_SCORE_LABELS = SCORE_LABELS;

export {
  donutFillFromLegacyBand as snapshotDonutFillFromLegacyBand,
  donutFillFromOverall as snapshotDonutFillFromOverall,
  legacyUxBand as snapshotLegacyUxBand,
  scoreColorFrom100 as snapshotScoreColorFrom100,
} from '../../lib/snapshot-landing-helpers';

export { SnapshotScoreDonut } from './SnapshotScoreDonut';

export function SnapshotScoreContextNotes(props: {
  result: FreeSnapshotPreview;
  showTopDivider?: boolean;
}) {
  const { result, showTopDivider = true } = props;
  const has100 = typeof result.overall_score === 'number';
  const band = legacyUxBand(result.ux_score);
  const scan = result.scan_confidence_band;
  const zeroPagesNote = snapshotZeroPagesScoreNote(result);

  return (
    <div
      className={
        showTopDivider
          ? 'mt-5 border-t border-[var(--border-subtle)] pt-4'
          : 'mt-3 text-left sm:mt-4'
      }
    >
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
      >
        What these numbers mean
      </p>
      <div className="space-y-3">
        {zeroPagesNote ? (
          <p className="text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
            {zeroPagesNote}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {has100
            ? fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: true })
            : fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: false })}
        </p>
        {scan && (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {scanConfidenceExplanation(scan)}
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryBreakdownHint(props: { label: string; categoryKey: SnapshotCategoryScoreKey }) {
  const { label, categoryKey } = props;
  const copy = SNAPSHOT_CATEGORY_BREAKDOWN_HINTS[categoryKey];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded p-0.5 text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glc-blue)]"
          aria-label={`What “${label}” means in this report`}
        >
          <Info size={15} weight="bold" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[min(22rem,92vw)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-[var(--text-primary)] shadow-lg [&>svg]:hidden"
      >
        {copy}
      </TooltipContent>
    </Tooltip>
  );
}

export function SnapshotCategoryBreakdownList({ result }: { result: FreeSnapshotPreview }) {
  if (!result.category_scores) return null;
  const cs = result.category_scores;
  const rows: Array<[string, SnapshotCategoryScoreKey, number]> = [
    ['UX clarity', 'ux_clarity', cs.ux_clarity],
    ['Conversion readiness', 'conversion_readiness', cs.conversion_readiness],
    ['AI readiness', 'ai_readiness', cs.ai_readiness],
    ['Technical basics', 'technical_basics', cs.technical_basics],
  ];
  return (
    <div
      className="glc-card glc-snapshot-result-card glc-snapshot-surface-category mb-4 p-5 lg:p-6 ds-radius-xl"
      
    >
      <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral">
        <span className="glc-snapshot-section-h__rule" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Category breakdown
        </span>
      </div>
      <ul className="space-y-4 text-sm lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
        {rows.map(([label, key, val]) => {
          const pct = Math.max(0, Math.min(100, val));
          const barColor = scoreColorFrom100(val);
          return (
            <li key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="truncate">{label}</span>
                  <CategoryBreakdownHint label={label} categoryKey={key} />
                </span>
                <span
                  className="font-semibold tabular-nums ds-score-bar-label"
                  style={{ ['--ds-score-bar-label' as string]: barColor } as CSSProperties}
                >
                  {val}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full ds-score-bar-track" aria-hidden>
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out ds-score-bar-fill"
                  style={
                    {
                      width: `${pct}%`,
                      ['--ds-score-bar-fill' as string]: barColor,
                    } as CSSProperties
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
      {result.scan_basis && (
        <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-quaternary)]">
          Based on: {result.scan_basis}
        </p>
      )}
    </div>
  );
}

export function snapshotSiteProfileSoftLine(profile: SnapshotSiteProfile | undefined): string | null {
  if (!profile) return null;
  const low = profile.classificationConfidenceBand === 'low';
  const type = profile.siteType.replace(/-/g, ' ');
  const ind = profile.industry.replace(/-/g, ' ');
  if (profile.industry !== 'unknown' && profile.siteType !== 'unknown') {
    return low
      ? `Signals suggest something like a ${type} in ${ind} — automatic read only, not a final label.`
      : `This looks like a ${type} in ${ind} (automatic read from your pages).`;
  }
  if (profile.siteType !== 'unknown') {
    return low
      ? `Signals suggest a ${type}-style site — we could not pin down a specific industry automatically.`
      : `This looks like a ${type}-style site based on visible signals.`;
  }
  return 'We could not confidently categorise this site from the sampled pages alone.';
}

export { snapshotClassificationExplainerLine } from '../../lib/snapshot-landing-helpers';
