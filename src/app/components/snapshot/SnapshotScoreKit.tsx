/**
 * Shared snapshot score visuals (portal mirror + parity with SnapshotLanding).
 */

import type { ReactNode } from 'react';
import { Info } from '@phosphor-icons/react';
import { SCORE_COLORS, SCORE_LABELS } from '@glc/intake-core';
import type { FreeSnapshotPreview, SnapshotSiteProfile } from '../../data/auditTypes';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { scanConfidenceExplanation, snapshotZeroPagesScoreNote } from '../../lib/snapshot-diagnostics';

export type SnapshotCategoryScoreKey =
  | 'ux_clarity'
  | 'conversion_readiness'
  | 'ai_readiness'
  | 'technical_basics';

const SNAPSHOT_CATEGORY_BREAKDOWN_HINTS: Record<SnapshotCategoryScoreKey, string> = {
  ux_clarity:
    'How clear the first screen is for someone who has never seen your brand: what you do, who it is for, primary navigation, trust signals, how easy contact is to find, and basic language/accessibility markers. The score is the share of automated UX checks that passed on the HTML we fetched (0–100)—a thin sample, not a full UX review.',
  conversion_readiness:
    'How easy it is to take the next step: strength of the main call-to-action, form labels and friction, whether pricing or commerce paths are discoverable, competing buttons in the hero, reassurance near actions, FAQs, and simple risk reducers. The number is the portion of those checks that passed in this snapshot (0–100), based only on pages we could load.',
  ai_readiness:
    'How much structured, machine-readable context we found—mainly JSON-LD (Organization, WebSite, products, offers, FAQ, breadcrumbs, etc.) that our rules expect. Higher means more of those checks passed on the sampled markup. It is not a promise about rankings or citations inside any specific AI product.',
  technical_basics:
    'Baseline technical signals in our grab: page title, viewport meta, HTTPS/canonical hints, whether the page looks indexable, Open Graph basics, informative alt text on images, and breadth of structured data. The score is the share of those checks that passed (0–100); it is not a penetration test or performance audit.',
};

export const SNAPSHOT_SCORE_COLORS = SCORE_COLORS;
export const SNAPSHOT_SCORE_LABELS = SCORE_LABELS;

export function snapshotScoreColorFrom100(n: number): string {
  if (n >= 80) return SNAPSHOT_SCORE_COLORS[5];
  if (n >= 60) return SNAPSHOT_SCORE_COLORS[4];
  if (n >= 40) return SNAPSHOT_SCORE_COLORS[3];
  if (n >= 20) return SNAPSHOT_SCORE_COLORS[2];
  return SNAPSHOT_SCORE_COLORS[1];
}

export function snapshotLegacyUxBand(uxScore: number | null | undefined): keyof typeof SNAPSHOT_SCORE_COLORS {
  if (uxScore != null && uxScore >= 1 && uxScore <= 5) return uxScore;
  return 3;
}

export function snapshotDonutFillFromOverall(overall: number): number {
  return Math.max(0, Math.min(100, overall));
}

export function snapshotDonutFillFromLegacyBand(band: keyof typeof SNAPSHOT_SCORE_COLORS): number {
  return Math.max(0, Math.min(100, (Number(band) / 5) * 100));
}

function fivePointBandExplanation(params: {
  band: keyof typeof SNAPSHOT_SCORE_COLORS;
  uxLabel: string | null | undefined;
  hasOverall100: boolean;
}): string {
  if (params.hasOverall100) {
    return 'The score out of 100 sums every rule we ran on the pages we could fetch in this snapshot—not a separate audit.';
  }
  const label = params.uxLabel?.trim() || SNAPSHOT_SCORE_LABELS[params.band];
  const step = params.band;
  return (
    `This ${step}/5 result (${label}) uses that same five-point band (1 = Critical … 5 = Excellent). ` +
    'It reflects rule-based checks on the pages we could access—not a full consulting review.'
  );
}

export function SnapshotScoreContextNotes(props: {
  result: FreeSnapshotPreview;
  showTopDivider?: boolean;
}) {
  const { result, showTopDivider = true } = props;
  const has100 = typeof result.overall_score === 'number';
  const band = snapshotLegacyUxBand(result.ux_score);
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
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-tertiary)' }}
      >
        What these numbers mean
      </p>
      <div className="space-y-3">
        {zeroPagesNote ? (
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {zeroPagesNote}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {has100
            ? fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: true })
            : fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: false })}
        </p>
        {scan && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {scanConfidenceExplanation(scan)}
          </p>
        )}
      </div>
    </div>
  );
}

export function SnapshotScoreDonut(props: {
  fillPercent: number;
  accentColor: string;
  size?: number;
  strokeWidth?: number;
  children: ReactNode;
}) {
  const { fillPercent, accentColor, size = 168, strokeWidth = 11, children } = props;
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, fillPercent));
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="relative mx-auto flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="[transition:stroke-dashoffset_0.75s_cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>
      <div className="relative z-[1] flex flex-col items-center justify-center px-2 text-center">{children}</div>
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
      className="glc-card glc-snapshot-result-card glc-snapshot-surface-category mb-4 p-5 lg:p-6"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral">
        <span className="glc-snapshot-section-h__rule" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Category breakdown
        </span>
      </div>
      <ul className="space-y-4 text-sm lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
        {rows.map(([label, key, val]) => {
          const pct = Math.max(0, Math.min(100, val));
          const barColor = snapshotScoreColorFrom100(val);
          return (
            <li key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="truncate">{label}</span>
                  <CategoryBreakdownHint label={label} categoryKey={key} />
                </span>
                <span className="font-semibold tabular-nums" style={{ color: barColor }}>
                  {val}/100
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--bg-muted)' }}
                aria-hidden
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: barColor, opacity: 0.92 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {result.scan_basis && (
        <p
          className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed"
          style={{ color: 'var(--text-quaternary)' }}
        >
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
