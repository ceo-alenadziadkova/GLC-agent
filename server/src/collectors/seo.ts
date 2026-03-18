import { BaseCollector } from './base.js';
import { supabase } from '../services/supabase.js';

export class SeoCollector extends BaseCollector {
  get key() { return 'seo_meta'; }
  get phase() { return 3; }

  async collect(auditId: string, companyUrl: string) {
    // Get crawled pages from the crawler's collected data
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
        warning: 'No crawled pages available — SEO page analysis skipped',
        robots_txt: await this.checkRobotsTxt(companyUrl),
        sitemap: await this.checkSitemap(companyUrl),
        open_graph: { pages_with_structured_data: 0, total_pages: 0, structured_data_types: [] },
        page_analysis: { issues: ['No pages were crawled — cannot assess on-page SEO'], meta_coverage: { with_title: 0, with_description: 0, with_h1: 0, total: 0 }, image_stats: { total: 0, missing_alt: 0 } },
        total_pages: 0,
      };
    }

    const [robotsTxt, sitemap, openGraph] = await Promise.all([
      this.checkRobotsTxt(companyUrl),
      this.checkSitemap(companyUrl),
      this.analyzeOpenGraph(pages),
    ]);

    const pageAnalysis = this.analyzePages(pages);

    return {
      robots_txt: robotsTxt,
      sitemap,
      open_graph: openGraph,
      page_analysis: pageAnalysis,
      total_pages: pages.length,
    };
  }

  private async checkRobotsTxt(url: string) {
    try {
      const baseUrl = new URL(url);
      const response = await fetch(`${baseUrl.origin}/robots.txt`, {
        headers: { 'User-Agent': 'GLC-AuditBot/1.0' },
      });

      if (!response.ok) {
        return { exists: false, content: null, issues: ['No robots.txt found'] };
      }

      const content = await response.text();
      const issues: string[] = [];

      if (!content.includes('Sitemap:')) {
        issues.push('robots.txt does not reference a sitemap');
      }
      if (content.includes('Disallow: /')) {
        issues.push('robots.txt blocks all crawlers with "Disallow: /"');
      }

      return { exists: true, content: content.substring(0, 2000), issues };
    } catch {
      return { exists: false, content: null, issues: ['Failed to fetch robots.txt'] };
    }
  }

  private async checkSitemap(url: string) {
    const baseUrl = new URL(url);
    const sitemapUrls = [
      `${baseUrl.origin}/sitemap.xml`,
      `${baseUrl.origin}/sitemap_index.xml`,
      `${baseUrl.origin}/sitemap.txt`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: { 'User-Agent': 'GLC-AuditBot/1.0' },
        });

        if (response.ok) {
          const content = await response.text();
          const urlCount = (content.match(/<loc>/g) ?? []).length;

          return {
            exists: true,
            url: sitemapUrl,
            url_count: urlCount,
            format: sitemapUrl.endsWith('.xml') ? 'xml' : 'text',
          };
        }
      } catch {
        continue;
      }
    }

    return { exists: false, url: null, url_count: 0, format: null };
  }

  private analyzeOpenGraph(pages: Array<Record<string, unknown>>) {
    // This would ideally re-parse HTML, but we use crawled data
    const pagesWithStructuredData = pages.filter(p => {
      const sd = p.structured_data as string[];
      return sd && sd.length > 0;
    });

    return {
      pages_with_structured_data: pagesWithStructuredData.length,
      total_pages: pages.length,
      structured_data_types: [...new Set(pages.flatMap(p => (p.structured_data as string[]) ?? []))],
    };
  }

  private analyzePages(pages: Array<Record<string, unknown>>) {
    const issues: string[] = [];

    // Check for duplicate titles
    const titles = pages.map(p => p.title as string).filter(Boolean);
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size < titles.length) {
      issues.push(`${titles.length - uniqueTitles.size} pages share duplicate title tags`);
    }

    // Check for missing meta descriptions
    const missingMeta = pages.filter(p => !p.meta_description);
    if (missingMeta.length > 0) {
      issues.push(`${missingMeta.length} pages missing meta description`);
    }

    // Check for missing H1
    const missingH1 = pages.filter(p => {
      const h1 = p.h1 as string[];
      return !h1 || h1.length === 0;
    });
    if (missingH1.length > 0) {
      issues.push(`${missingH1.length} pages missing H1 tag`);
    }

    // Check for duplicate H1 on same page
    const duplicateH1 = pages.filter(p => {
      const h1 = p.h1 as string[];
      return h1 && h1.length > 1;
    });
    if (duplicateH1.length > 0) {
      issues.push(`${duplicateH1.length} pages have multiple H1 tags`);
    }

    // Check image alt texts
    const totalImages = pages.reduce((sum, p) => {
      const imgs = p.images as { total: number; missing_alt: number } | undefined;
      return sum + (imgs?.total ?? 0);
    }, 0);
    const missingAltImages = pages.reduce((sum, p) => {
      const imgs = p.images as { total: number; missing_alt: number } | undefined;
      return sum + (imgs?.missing_alt ?? 0);
    }, 0);
    if (missingAltImages > 0) {
      issues.push(`${missingAltImages} of ${totalImages} images missing alt text`);
    }

    return {
      issues,
      meta_coverage: {
        with_title: titles.length,
        with_description: pages.length - missingMeta.length,
        with_h1: pages.length - missingH1.length,
        total: pages.length,
      },
      image_stats: {
        total: totalImages,
        missing_alt: missingAltImages,
      },
    };
  }
}
