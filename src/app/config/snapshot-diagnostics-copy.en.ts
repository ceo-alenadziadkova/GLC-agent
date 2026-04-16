export const SNAPSHOT_DIAGNOSTICS_COPY = {
  aiVisibilityGap: {
    robots_txt:
      'Robots.txt — we could not verify a reliable live file from what we saw: confirm crawl rules and any sitemap line with whoever owns the site.',
    sitemap_html:
      'Sitemap / full URL list — we did not see a clear discovery path from what we read: confirm published sitemap and that internal links or headers expose it correctly.',
    structured_data:
      'Structured data — reads thin on the templates we saw: strengthen JSON-LD on key pages so assistants can quote you instead of inferring.',
    discovery_files:
      'llms.txt / ai.txt — not surfaced on the pages we checked: add if policy allows and you want explicit guidance for AI crawlers.',
  },
  robotsFallbackMajorPlatform: 'Common on large sites: root blocked, inner pages allowed.',
  robotsFallbackGeneric: 'Inner pages only — not the homepage.',
  robotsNoHtmlSample:
    'No HTML in this sample: homepage blocked by site crawl policy (we still follow robots.txt).',
  sampledPattern:
    'Sampled {pagesFetched} of up to {maxPages} pages in {elapsedSec}s (time budget {budgetSec}s): {sample}. Paths from internal links on those pages also inform signals.',
  renderedInBrowser: 'Homepage was also rendered in a headless browser to capture client-side content.',
  appShellHint:
    'Static HTML looked like a JavaScript app shell; enable server Playwright to deepen the homepage read.',
  robotsExtrasSkipped: '{count} extra page(s) were skipped to honor robots.txt.',
  challengeLikely:
    'The HTML looks like a bot challenge or security interstitial — treat scores as a rough baseline only.',
  parkedDomainLikely: 'The page resembles a parked or for-sale domain.',
  loginWallLikely:
    'The public page looks like a sign-in gate; most content may require authentication.',
  zeroPagesScoreNote:
    'Scores are based on 0 pages sampled. A Starter, Pro, or Complete audit can use your brief, exports, or approved access when the live site cannot be read automatically.',
  scanConfidenceHigh:
    'High scan confidence means we sampled enough of your public pages under normal conditions, so these scores should broadly match what a typical visitor sees.',
  scanConfidenceMedium:
    'Medium scan confidence means the snapshot is still useful, but some pages were skipped, behaviour was unusual, or coverage was thin—treat the numbers as directional, not exact.',
  scanConfidenceLow:
    'Low scan confidence means robots blocked part of the site, the HTML looked like a login wall or parking page, or we captured very little usable content—treat this as a rough signal only.',
  degradedSnapshotSummaryMark: 'No automated GLC snapshot score',
} as const;

export const SNAPSHOT_API_ERROR_COPY = {
  sessionExpired: 'Session expired or invalid. Refresh the page and sign in again.',
  tooManyRequests: 'Too many requests.',
  ownerUnavailable: 'This feature is temporarily unavailable. Please try again in a few minutes.',
  serverErrorStart: 'Server error while starting analysis. Please try again in a minute.',
} as const;
