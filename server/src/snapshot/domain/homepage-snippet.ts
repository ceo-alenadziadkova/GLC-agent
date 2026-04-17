import {
  SNAPSHOT_HOMEPAGE_SNIPPET_MAX_CHARS,
  SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_SUFFIX,
  SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_TO,
} from '../config/snapshot-runtime.js';
import type { SnapshotFacts } from '../types.js';

/** Best-effort homepage excerpt for the public preview (meta description, og:description, or first paragraph). */
export function buildHomepageSnippet(
  facts: SnapshotFacts,
): { title: string; description: string } | undefined {
  const title = facts.siteText.title.trim();
  const meta = facts.siteText.metaDescription.trim();
  const og = facts.siteText.ogDescription.trim();
  let description = meta || og;
  if (!description && facts.siteText.topParagraphs[0]) {
    const p0 = facts.siteText.topParagraphs[0].trim();
    description =
      p0.length > SNAPSHOT_HOMEPAGE_SNIPPET_MAX_CHARS
        ? `${p0.slice(0, SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_TO)}${SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_SUFFIX}`
        : p0;
  }
  if (!title && !description) return undefined;
  return { title, description };
}
