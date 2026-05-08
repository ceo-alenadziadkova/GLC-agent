import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkUx(
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  const a11y = collected['accessibility'];
  if (!a11y) return;
  const noCrawlData = a11y.no_crawl_data === true;

  const imageA11y = a11y.image_accessibility as { alt_coverage_percent: number } | undefined;
  const headingHierarchy = a11y.heading_hierarchy as {
    pages_with_no_h1: number;
    pages_with_broken_hierarchy: number;
  } | undefined;
  const pagesAnalyzed = (a11y.pages_analyzed as number | undefined) ?? 0;
  const structuredDataPresent = a11y.structured_data_present as boolean | undefined;

  const uxCopy = factCheckerCopy().ux;

  if (
    imageA11y &&
    !noCrawlData &&
    imageA11y.alt_coverage_percent < T.ux.imageAltMinCoveragePercent &&
    result.score >= T.ux.flagMinScore
  ) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(uxCopy.imageAltIssueTemplate, {
        pct: imageA11y.alt_coverage_percent,
      }),
      raw_evidence: interpolateFactCheckerMessage(uxCopy.imageAltRawEvidenceTemplate, {
        pct: imageA11y.alt_coverage_percent,
      }),
      action: 'flag',
    });
  }

  if (
    headingHierarchy &&
    !noCrawlData &&
    headingHierarchy.pages_with_no_h1 > T.ux.maxPagesWithoutH1 &&
    result.score >= T.ux.flagMinScore
  ) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(uxCopy.pagesWithoutH1IssueTemplate, {
        count: headingHierarchy.pages_with_no_h1,
      }),
      raw_evidence: interpolateFactCheckerMessage(uxCopy.pagesWithoutH1RawEvidenceTemplate, {
        count: headingHierarchy.pages_with_no_h1,
      }),
      action: 'flag',
    });
  }

  if (
    headingHierarchy &&
    !noCrawlData &&
    headingHierarchy.pages_with_broken_hierarchy > T.ux.maxBrokenHeadingPages &&
    result.score >= T.ux.flagMinScore
  ) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(uxCopy.brokenHeadingHierarchyIssueTemplate, {
        count: headingHierarchy.pages_with_broken_hierarchy,
      }),
      raw_evidence: interpolateFactCheckerMessage(uxCopy.brokenHeadingHierarchyRawEvidenceTemplate, {
        count: headingHierarchy.pages_with_broken_hierarchy,
      }),
      action: 'flag',
    });
  }

  if (
    pagesAnalyzed > 0 &&
    !noCrawlData &&
    structuredDataPresent === false &&
    result.score >= T.ux.flagMinScore
  ) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(uxCopy.lowStructuredDataPresenceIssueTemplate, {
        pct: 0,
      }),
      raw_evidence: interpolateFactCheckerMessage(uxCopy.lowStructuredDataPresenceRawEvidenceTemplate, {
        with_sd: 0,
        total: pagesAnalyzed,
      }),
      action: 'flag',
    });
  }
}

