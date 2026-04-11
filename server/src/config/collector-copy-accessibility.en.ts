/**
 * User-visible strings for AccessibilityCollector (reports / collected_data).
 */

export const ACCESSIBILITY_COLLECTOR_COPY = {
  warningNoPublicWebsite: 'No public website — accessibility analysis skipped',
  issueNoPublicWebsite: 'No public website — cannot assess accessibility against a live site',
  warningNoCrawl: 'No crawled pages available — accessibility analysis skipped',
  issueNoPagesCrawled: 'No pages were crawled — cannot assess accessibility',
  issueStructuredDataMissing:
    'No structured data (Schema.org) found — impacts screen reader usability',
  issueHtmlLangMissing: 'No HTML lang attribute detected — screen readers cannot determine page language',
} as const;

export function accessibilityImagesMissingAltMessage(missingAlt: number, pageCount: number): string {
  return `${missingAlt} images missing alt text across ${pageCount} pages`;
}

export function accessibilityBrokenHeadingHierarchyMessage(pageCount: number): string {
  return `${pageCount} page(s) have H2 headings without an H1 — broken heading hierarchy`;
}

export function accessibilityMultipleH1Message(pageCount: number): string {
  return `${pageCount} page(s) have multiple H1 tags — should have exactly one`;
}

export function accessibilityNoH1Message(pageCount: number): string {
  return `${pageCount} page(s) have no H1 tag — required for screen reader navigation`;
}
