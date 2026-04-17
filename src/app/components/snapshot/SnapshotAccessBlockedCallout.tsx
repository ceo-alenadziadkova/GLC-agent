/**
 * When robots.txt or fetch failure prevented sampling HTML — explain clearly and suggest next steps.
 */

import { SealCheck, Warning } from '@phosphor-icons/react';
import { cn } from '../ui/utils';

export function SnapshotAccessBlockedCallout(props: {
  robotsBlocked: boolean;
  noHtmlSample: boolean;
  /** When true: homepage disallowed by robots but other allowed pages were sampled. */
  robotsLimitedSample?: boolean;
  robotsFallbackSiteClass?: 'major_platform' | 'standard';
  /** From scan_coverage.robots_head_probe.status when homepage was probed with HEAD only. */
  robotsHeadHttpStatus?: number;
  limitations?: string[];
}) {
  const {
    robotsBlocked,
    noHtmlSample,
    robotsLimitedSample = false,
    robotsFallbackSiteClass,
    robotsHeadHttpStatus,
    limitations = [],
  } = props;
  if (!robotsBlocked && !noHtmlSample) return null;

  const policyVisual = robotsBlocked;
  const accent = policyVisual ? 'var(--glc-green)' : 'var(--score-2)';
  const panelBg = policyVisual
    ? 'color-mix(in oklab, var(--glc-green) 09%, var(--bg-surface))'
    : 'color-mix(in oklab, var(--score-2) 08%, var(--bg-surface))';

  const suggestionLines =
    robotsBlocked && !robotsLimitedSample
      ? [
          'If you control the site: allow good-faith preview crawlers on key paths you want tested (/about, /pricing, or a campaign landing page).',
          'Try another public URL if that path is allowed while the homepage is not.',
          'For Starter, Pro, or Complete audit: use your brief, exports, or another approved access path.',
        ]
      : robotsBlocked && robotsLimitedSample
        ? robotsFallbackSiteClass === 'major_platform'
          ? [
              'Large platforms often block the root URL for bots; marketing or help pages may still be allowed.',
              'Need the homepage in this check? Use a path robots allows or ask the operator of the domain.',
            ]
          : [
              'To include the homepage, allow `/` for preview crawlers or submit a URL that policy explicitly permits.',
            ]
        : [];

  const headClause =
    typeof robotsHeadHttpStatus === 'number' && Number.isFinite(robotsHeadHttpStatus)
      ? ` We only ran HEAD on the homepage (HTTP ${robotsHeadHttpStatus}) — no HTML body.`
      : '';

  return (
    <div
      className={cn(
        'glc-card mb-5 border p-5 text-left lg:mb-6 lg:p-6',
        policyVisual
          ? 'border-[color-mix(in_oklab,var(--glc-green)_35%,var(--border-default))] shadow-[inset_3px_0_0_var(--glc-green)]'
          : 'border-[var(--border-default)] shadow-[inset_3px_0_0_var(--score-2)]',
      )}
      style={{ background: panelBg }}
      role="status"
    >
      <div className="mb-3 flex items-start gap-3">
        {policyVisual ? (
          <SealCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} weight="fill" aria-hidden />
        ) : (
          <Warning className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} weight="fill" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {robotsBlocked
              ? robotsLimitedSample
                ? 'Preview limited: inner pages sampled'
                : 'Preview limited: robots.txt policy'
              : 'We could not load public pages for this check'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {robotsBlocked && robotsLimitedSample ? (
              <>
                Site crawl rules blocked downloading the <strong className="text-[var(--text-primary)]">homepage</strong>. We did not GET that URL; other <strong className="text-[var(--text-primary)]">allowed</strong> same-origin pages were sampled within normal limits. Treat scores as{' '}
                <strong className="text-[var(--text-primary)]">directional</strong>, not a full homepage read.
              </>
            ) : robotsBlocked ? (
              <>
                <strong className="text-[var(--text-primary)]">GLC-SnapshotScanner</strong> respects robots.txt, so we did not download homepage HTML.{headClause} Scores below are{' '}
                <strong className="text-[var(--text-primary)]">placeholders</strong> — not a judgment of business quality.
                {robotsFallbackSiteClass === 'major_platform' ? (
                  <> Common on large platforms.</>
                ) : null}
              </>
            ) : (
              <>
                The free check needs at least one public HTML page. Something prevented a successful sample (see below).
                Scores and categories are not meaningful until we can read the live site.
              </>
            )}
          </p>
        </div>
      </div>
      {robotsBlocked && suggestionLines.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {suggestionLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {limitations.length > 0 && (
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {limitations.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
