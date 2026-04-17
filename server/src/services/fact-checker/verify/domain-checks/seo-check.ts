import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkSeo(
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  const seoData = collected['seo_meta'];
  if (!seoData) return;

  const sitemap = seoData.sitemap as { exists: boolean } | undefined;
  const robotsTxt = seoData.robots_txt as { exists: boolean; issues?: string[] } | undefined;
  const pageAnalysis = seoData.page_analysis as {
    issues: string[];
    meta_coverage: { with_description: number; total: number };
  } | undefined;
  const openGraph = seoData.open_graph as {
    pages_with_structured_data: number;
    total_pages: number;
  } | undefined;

  const seoCopy = factCheckerCopy().seo;

  // Can't score 5 without sitemap
  if (sitemap && !sitemap.exists && result.score === T.seo.perfectScore) {
    corrections.push({
      field: 'score',
      issue: seoCopy.noSitemapIssue,
      raw_evidence: seoCopy.noSitemapRawEvidence,
      action: 'flag',
    });
  }

  // Can't score 5 without robots.txt
  if (robotsTxt && !robotsTxt.exists && result.score === T.seo.perfectScore) {
    corrections.push({
      field: 'score',
      issue: seoCopy.noRobotsIssue,
      raw_evidence: seoCopy.noRobotsRawEvidence,
      action: 'flag',
    });
  }

  // Low meta coverage should lower score
  if (pageAnalysis?.meta_coverage) {
    const coverage = pageAnalysis.meta_coverage.with_description / pageAnalysis.meta_coverage.total;
    if (coverage < T.seo.metaDescriptionMinCoverage && result.score >= T.seo.metaDescriptionFlagMinScore) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(seoCopy.metaCoverageIssueTemplate, {
          pct: Math.round(coverage * 100),
        }),
        raw_evidence: interpolateFactCheckerMessage(seoCopy.metaCoverageRawEvidenceTemplate, {
          with_desc: pageAnalysis.meta_coverage.with_description,
          total: pageAnalysis.meta_coverage.total,
        }),
        action: 'flag',
      });
    }
  }

  const robotsIssues = robotsTxt?.issues ?? [];
  if (robotsIssues.length > T.seo.maxRobotsIssuesCount && result.score >= T.seo.metaDescriptionFlagMinScore) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(seoCopy.robotsIssuesDetectedIssueTemplate, {
        count: robotsIssues.length,
      }),
      raw_evidence: interpolateFactCheckerMessage(seoCopy.robotsIssuesDetectedRawEvidenceTemplate, {
        issues: robotsIssues.slice(0, 3).join(' | '),
      }),
      action: 'flag',
    });
  }

  if (openGraph && openGraph.total_pages > 0) {
    const structuredCoverage = openGraph.pages_with_structured_data / openGraph.total_pages;
    if (structuredCoverage < T.seo.minStructuredDataCoverage && result.score >= T.seo.metaDescriptionFlagMinScore) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(seoCopy.lowStructuredDataCoverageIssueTemplate, {
          pct: Math.round(structuredCoverage * 100),
        }),
        raw_evidence: interpolateFactCheckerMessage(seoCopy.lowStructuredDataCoverageRawEvidenceTemplate, {
          with_sd: openGraph.pages_with_structured_data,
          total: openGraph.total_pages,
        }),
        action: 'flag',
      });
    }
  }
}

