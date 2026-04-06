import type { AiVisibilityGapId, SnapshotFacts, SnapshotScanCoverage } from './types.js';

export type { AiVisibilityGapId };

/** Gaps for messaging: this quick scan did not establish strong machine-facing coverage. */
export function deriveAiVisibilityGaps(
  facts: SnapshotFacts,
  coverage: SnapshotScanCoverage | undefined,
): AiVisibilityGapId[] {
  const gaps: AiVisibilityGapId[] = [];
  if (coverage?.robotsTxtFetched === false) {
    gaps.push('robots_txt');
  }
  if (!facts.machineReadableSurface.sitemapLinkInHtml) {
    gaps.push('sitemap_html');
  }
  if (facts.schema.types.length <= 1) {
    gaps.push('structured_data');
  }
  if (!facts.machineReadableSurface.llmsOrAiTxtLinked) {
    gaps.push('discovery_files');
  }
  return gaps;
}
