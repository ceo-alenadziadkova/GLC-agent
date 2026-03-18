import { BaseCollector } from './base.js';
import { supabase } from '../services/supabase.js';

export class AccessibilityCollector extends BaseCollector {
  get key() { return 'accessibility'; }
  get phase() { return 4; }

  async collect(auditId: string, _companyUrl: string) {
    // Get crawled pages data
    const { data: crawlData } = await supabase
      .from('collected_data')
      .select('data')
      .eq('audit_id', auditId)
      .eq('collector_key', 'crawler')
      .single();

    const pages = (crawlData?.data as Record<string, unknown>)?.pages_crawled as Array<Record<string, unknown>> ?? [];

    if (pages.length === 0) {
      return {
        no_crawl_data: true,
        warning: 'No crawled pages available — accessibility analysis skipped',
        image_accessibility: { total_images: 0, missing_alt: 0, alt_coverage_percent: 100 },
        structured_data_present: false,
        issues: ['No pages were crawled — cannot assess accessibility'],
        pages_analyzed: 0,
      };
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
      issues.push(`${missingAlt} images missing alt text across ${pages.length} pages`);
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
      issues.push('No structured data (Schema.org) found — impacts screen reader usability');
    }

    // Heading hierarchy check (R8): pages should have H1 before H2
    const pagesWithBrokenHierarchy = pages.filter(p => {
      const h1 = (p.h1 as string[]) ?? [];
      const h2 = (p.h2 as string[]) ?? [];
      return h2.length > 0 && h1.length === 0; // H2 without H1 = broken hierarchy
    });
    if (pagesWithBrokenHierarchy.length > 0) {
      issues.push(`${pagesWithBrokenHierarchy.length} page(s) have H2 headings without an H1 — broken heading hierarchy`);
    }

    // Multiple H1s on same page (bad practice)
    const pagesWithMultipleH1 = pages.filter(p => ((p.h1 as string[]) ?? []).length > 1);
    if (pagesWithMultipleH1.length > 0) {
      issues.push(`${pagesWithMultipleH1.length} page(s) have multiple H1 tags — should have exactly one`);
    }

    // Pages completely missing H1
    const pagesWithNoH1 = pages.filter(p => ((p.h1 as string[]) ?? []).length === 0);
    if (pagesWithNoH1.length > 0) {
      issues.push(`${pagesWithNoH1.length} page(s) have no H1 tag — required for screen reader navigation`);
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
      issues.push('No HTML lang attribute detected — screen readers cannot determine page language');
    }

    const altCoveragePercent = totalImages > 0
      ? Math.round(((totalImages - missingAlt) / totalImages) * 100)
      : 100;

    return {
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
  }
}
