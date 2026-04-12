import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import {
  ACCESSIBILITY_COLLECTOR_COPY,
  accessibilityBrokenHeadingHierarchyMessage,
  accessibilityImagesMissingAltMessage,
  accessibilityMultipleH1Message,
  accessibilityNoH1Message,
} from '../config/collector-copy-accessibility.en.js';
import { BaseCollector, type CollectorCollectContext } from './base.js';
import { supabase } from '../services/supabase.js';
import { COLLECTOR_ACCESSIBILITY_AUDIT_URLS_MAX } from '../config/collector-sampling-limits.js';
import { auditAxeNavigateTimeoutMs, auditAxePlaywrightEnabled } from '../lib/audit-deep-scan-env.js';
import { runAxeOnPublicUrls } from '../lib/axe-playwright-audit.js';
import { logger } from '../services/logger.js';

export class AccessibilityCollector extends BaseCollector {
  get key() { return 'accessibility'; }
  get phase() { return 4; }

  async collect(auditId: string, companyUrl: string, ctx?: CollectorCollectContext) {
    if (auditSkipsPublicWebsiteFetches(ctx?.noPublicWebsite, companyUrl)) {
      return {
        no_crawl_data: true,
        warning: ACCESSIBILITY_COLLECTOR_COPY.warningNoPublicWebsite,
        image_accessibility: { total_images: 0, missing_alt: 0, alt_coverage_percent: 100 },
        structured_data_present: false,
        issues: [ACCESSIBILITY_COLLECTOR_COPY.issueNoPublicWebsite],
        pages_analyzed: 0,
      };
    }
    // Get crawled pages data
    const { data: crawlData } = await supabase
      .from('collected_data')
      .select('data')
      .eq('audit_id', auditId)
      .eq('collector_key', 'crawler')
      .single();

    const pages = (crawlData?.data as Record<string, unknown>)?.pages_crawled as Array<Record<string, unknown>> ?? [];

    if (pages.length === 0) {
      const emptyCrawl = {
        no_crawl_data: true,
        warning: ACCESSIBILITY_COLLECTOR_COPY.warningNoCrawl,
        image_accessibility: { total_images: 0, missing_alt: 0, alt_coverage_percent: 100 },
        structured_data_present: false,
        issues: [ACCESSIBILITY_COLLECTOR_COPY.issueNoPagesCrawled],
        pages_analyzed: 0,
      };
      return this.attachAxeIfEnabled(auditId, companyUrl, [companyUrl], emptyCrawl);
    }

    const issues: string[] = [];
    let totalImages = 0;
    let missingAlt = 0;

    for (const page of pages) {
      const images = page.images as { total: number; missing_alt: number; with_alt: number } | undefined;
      if (images) {
        totalImages += images.total;
        missingAlt += images.missing_alt;
      }
    }

    if (missingAlt > 0) {
      issues.push(accessibilityImagesMissingAltMessage(missingAlt, pages.length));
    }

    // Structured data (Schema.org) — aids screen readers and search engines
    const hasStructuredData = pages.some(p => {
      const sd = p.structured_data as string[];
      return sd && sd.length > 0;
    });
    const allStructuredDataTypes = [...new Set(
      pages.flatMap(p => (p.structured_data as string[]) ?? [])
    )];

    if (!hasStructuredData) {
      issues.push(ACCESSIBILITY_COLLECTOR_COPY.issueStructuredDataMissing);
    }

    // Heading hierarchy check (R8): pages should have H1 before H2
    const pagesWithBrokenHierarchy = pages.filter(p => {
      const h1 = (p.h1 as string[]) ?? [];
      const h2 = (p.h2 as string[]) ?? [];
      return h2.length > 0 && h1.length === 0; // H2 without H1 = broken hierarchy
    });
    if (pagesWithBrokenHierarchy.length > 0) {
      issues.push(accessibilityBrokenHeadingHierarchyMessage(pagesWithBrokenHierarchy.length));
    }

    // Multiple H1s on same page (bad practice)
    const pagesWithMultipleH1 = pages.filter(p => ((p.h1 as string[]) ?? []).length > 1);
    if (pagesWithMultipleH1.length > 0) {
      issues.push(accessibilityMultipleH1Message(pagesWithMultipleH1.length));
    }

    // Pages completely missing H1
    const pagesWithNoH1 = pages.filter(p => ((p.h1 as string[]) ?? []).length === 0);
    if (pagesWithNoH1.length > 0) {
      issues.push(accessibilityNoH1Message(pagesWithNoH1.length));
    }

    // Language attribute inference from recon
    const { data: recon } = await supabase
      .from('audit_recon')
      .select('languages')
      .eq('audit_id', auditId)
      .single();
    const detectedLanguages = (recon?.languages as string[]) ?? [];
    const langAttributePresent = detectedLanguages.length > 0;
    if (!langAttributePresent) {
      issues.push(ACCESSIBILITY_COLLECTOR_COPY.issueHtmlLangMissing);
    }

    const altCoveragePercent = totalImages > 0
      ? Math.round(((totalImages - missingAlt) / totalImages) * 100)
      : 100;

    const base = {
      image_accessibility: {
        total_images: totalImages,
        missing_alt: missingAlt,
        alt_coverage_percent: altCoveragePercent,
      },
      heading_hierarchy: {
        pages_with_no_h1: pagesWithNoH1.length,
        pages_with_multiple_h1: pagesWithMultipleH1.length,
        pages_with_broken_hierarchy: pagesWithBrokenHierarchy.length,
        hierarchy_valid: pagesWithBrokenHierarchy.length === 0 && pagesWithNoH1.length === 0,
      },
      structured_data_present: hasStructuredData,
      structured_data_types: allStructuredDataTypes,
      lang_attribute_present: langAttributePresent,
      detected_languages: detectedLanguages,
      issues,
      pages_analyzed: pages.length,
    };

    const urls = [companyUrl, ...pages.map(p => p.url as string).filter(Boolean)].slice(
      0,
      COLLECTOR_ACCESSIBILITY_AUDIT_URLS_MAX,
    );
    return this.attachAxeIfEnabled(auditId, companyUrl, urls, base);
  }

  private async attachAxeIfEnabled(
    auditId: string,
    companyUrl: string,
    urls: string[],
    base: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!auditAxePlaywrightEnabled()) {
      return base;
    }

    logger.info('collector.accessibility.axe_start', { auditId, companyUrl, url_count: urls.length });

    try {
      const axePages = await runAxeOnPublicUrls(urls, auditAxeNavigateTimeoutMs());
      const totalViolations = axePages.reduce((s, p) => s + p.violations, 0);
      const totalCritSer = axePages.reduce((s, p) => s + p.critical_and_serious, 0);
      logger.info('collector.accessibility.axe_finished', {
        auditId,
        total_violations: totalViolations,
        critical_and_serious_total: totalCritSer,
      });
      return {
        ...base,
        axe_playwright: {
          enabled: true,
          pages: axePages,
          total_violations: totalViolations,
          critical_and_serious_total: totalCritSer,
        },
      };
    } catch (e) {
      logger.warn('collector.accessibility.axe_failed', { auditId, error: (e as Error).message });
      return {
        ...base,
        axe_playwright: { enabled: true, error: (e as Error).message },
      };
    }
  }
}
