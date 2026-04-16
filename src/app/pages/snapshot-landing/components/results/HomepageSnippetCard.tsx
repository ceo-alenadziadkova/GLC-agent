import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';

export function HomepageSnippetCard(props: { result: FreeSnapshotPreview }) {
  const { result } = props;
  if (!result.homepage_snippet) return null;
  if (!result.homepage_snippet.title.trim() && !result.homepage_snippet.description.trim()) return null;

  return (
    <div
      className="glc-card glc-snapshot-result-card mb-4 p-5 text-left lg:p-6"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {SNAPSHOT_LANDING_HERO_COPY.homepageSnippetTitle}
      </p>
      {result.homepage_snippet.title.trim() ? (
        <p
          className="text-sm font-semibold leading-snug mb-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {result.homepage_snippet.title}
        </p>
      ) : null}
      {result.homepage_snippet.description.trim() ? (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {result.homepage_snippet.description}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
        {SNAPSHOT_LANDING_HERO_COPY.homepageSnippetFootnote}
      </p>
    </div>
  );
}
