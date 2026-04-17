import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function MirrorHomepageSnippetSection({ snippet }: { snippet: { title: string; description: string } }) {
  if (!snippet.title.trim() && !snippet.description.trim()) return null;
  return (
    <div
      className="glc-card glc-snapshot-result-card p-5 text-left lg:p-6"
      style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardOutlined}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
        {PORTAL_SNAPSHOT_MIRROR_COPY.homepageSnippet.title}
      </p>
      {snippet.title.trim() ? (
        <p
          className="mb-2 text-sm font-semibold leading-snug"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {snippet.title}
        </p>
      ) : null}
      {snippet.description.trim() ? (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {snippet.description}
        </p>
      ) : null}
      <p className="mt-3 mb-0 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
        {PORTAL_SNAPSHOT_MIRROR_COPY.homepageSnippet.footer}
      </p>
    </div>
  );
}
