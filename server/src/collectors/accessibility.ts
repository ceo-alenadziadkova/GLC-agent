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

    // Check structured data for accessibility markers
    const hasStructuredData = pages.some(p => {
      const sd = p.structured_data as string[];
      return sd && sd.length > 0;
    });

    if (!hasStructuredData) {
      issues.push('No structured data (Schema.org) found — impacts screen reader usability');
    }

    return {
      image_accessibility: {
        total_images: totalImages,
        missing_alt: missingAlt,
        alt_coverage_percent: totalImages > 0 ? Math.round(((totalImages - missingAlt) / totalImages) * 100) : 100,
      },
      structured_data_present: hasStructuredData,
      issues,
      pages_analyzed: pages.length,
    };
  }
}
