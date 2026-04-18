import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { Surface } from '../../../../components/ui/surface';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';

export function HomepageSnippetCard(props: { result: FreeSnapshotPreview }) {
  const { result } = props;
  if (!result.homepage_snippet) return null;
  if (!result.homepage_snippet.title.trim() && !result.homepage_snippet.description.trim()) return null;

  return (
    <Surface
      padding="none"
      className="glc-card glc-snapshot-result-card mb-4 rounded-[var(--radius-xl)] p-5 text-left lg:p-6"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {SNAPSHOT_LANDING_HERO_COPY.homepageSnippetTitle}
      </p>
      {result.homepage_snippet.title.trim() ? (
        <p className="mb-2 text-sm font-semibold leading-snug text-[var(--text-primary)] [font-family:var(--font-display)]">
          {result.homepage_snippet.title}
        </p>
      ) : null}
      {result.homepage_snippet.description.trim() ? (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{result.homepage_snippet.description}</p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-quaternary)]">
        {SNAPSHOT_LANDING_HERO_COPY.homepageSnippetFootnote}
      </p>
    </Surface>
  );
}
