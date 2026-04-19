/**
 * UI policy for the recon summary shown at Review Gate #1 (after phase 0).
 * Limits belong here per project layering (no inline magic numbers in components).
 */
export const RECON_REVIEW_SUMMARY_POLICY = {
  /**
   * Matches server-side pipeline log prefix for context assembly truncation
   * (`pipeline-events-copy.v1.json` → `contextTruncated`).
   */
  crawlerContextTruncatedMessagePrefix: 'Context truncated for keys:',
  /** Collapsed list: how many crawled pages to show before "show all". */
  initialCrawledPagesVisible: 8,
  /** Cap visible structured-data chips per page row (remainder as "+N"). */
  maxStructuredDataChipsPerPage: 6,
  /** Max H1 lines shown per page in the summary list. */
  maxH1LinesPerPage: 2,
  /** Scroll container for long crawled-page lists inside the review modal. */
  crawledPagesListMaxHeightClassName: 'max-h-60',
} as const;
