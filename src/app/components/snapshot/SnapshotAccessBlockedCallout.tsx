/**
 * When robots.txt or fetch failure prevented sampling HTML — explain clearly and suggest next steps.
 */

import { Warning } from '@phosphor-icons/react';

export function SnapshotAccessBlockedCallout(props: {
  robotsBlocked: boolean;
  noHtmlSample: boolean;
  limitations?: string[];
}) {
  const { robotsBlocked, noHtmlSample, limitations = [] } = props;
  if (!robotsBlocked && !noHtmlSample) return null;

  const suggestionLines = robotsBlocked
    ? [
        'If you control the site: review robots.txt for rules that block automated previews. Allow good-faith crawlers on pages you want tested, or publish a marketing URL that is explicitly allowed.',
        'Try a different public URL (for example a campaign landing page) if robots allows that path while the homepage does not.',
        'For a full Express Audit, a consultant can work from your brief, exports you provide, or another approved access path.',
      ]
    : [];

  return (
    <div
      className="glc-card mb-5 border p-5 text-left lg:mb-6 lg:p-6"
      style={{
        borderRadius: 'var(--radius-xl)',
        borderColor: 'var(--border-default)',
        background: 'color-mix(in oklab, var(--score-2) 08%, var(--bg-surface))',
        boxShadow: 'inset 3px 0 0 var(--score-2)',
      }}
      role="status"
    >
      <div className="mb-3 flex items-start gap-3">
        <Warning className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--score-2)' }} weight="fill" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {robotsBlocked ? 'Site policy blocked our preview' : 'We could not load public pages for this check'}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {robotsBlocked ? (
              <>
                This address uses rules (robots.txt) that do not allow our snapshot crawler to read the homepage. We respect
                that, so <strong style={{ color: 'var(--text-primary)' }}>no HTML was downloaded</strong> and the scores
                below are placeholders — they are <strong style={{ color: 'var(--text-primary)' }}>not</strong> a quality
                rating of the business.
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
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {suggestionLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {!robotsBlocked && limitations.length > 0 && (
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {limitations.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
