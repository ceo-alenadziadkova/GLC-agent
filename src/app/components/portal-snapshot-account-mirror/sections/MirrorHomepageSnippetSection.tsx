import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function MirrorHomepageSnippetSection({ snippet }: { snippet: { title: string; description: string } }) {
  if (!snippet.title.trim() && !snippet.description.trim()) return null;
  return (
    <div
      className="ds-card ds-snapshot-result-card p-5 text-left lg:p-6"
      style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardOutlined}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {PORTAL_SNAPSHOT_MIRROR_COPY.homepageSnippet.title}
      </p>
      {snippet.title.trim() ? (
        <p
          className="mb-2 text-sm font-semibold leading-snug text-[var(--text-primary)] [font-family:var(--font-display)]"
        >
          {snippet.title}
        </p>
      ) : null}
      {snippet.description.trim() ? (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {snippet.description}
        </p>
      ) : null}
      <p className="mb-0 mt-3 text-xs leading-relaxed text-[var(--text-quaternary)]">
        {PORTAL_SNAPSHOT_MIRROR_COPY.homepageSnippet.footer}
      </p>
    </div>
  );
}
