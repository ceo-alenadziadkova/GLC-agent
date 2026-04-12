import robotsParser from 'robots-parser';

import { BaseCollector } from './base.js';
import { supabase } from '../services/supabase.js';
import { PublicUrlNotAllowedError, fetchPublicHttpUrl, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import type { CollectorCollectContext } from './base.js';
import { discoverSitemaps } from '../lib/sitemap-discovery.js';
import { AUDIT_ROBOTS_USER_AGENT } from '../lib/robots-policy-shared.js';
import {
  COLLECTOR_SEO_FETCH_TIMEOUT_MS,
  COLLECTOR_SEO_ROBOTS_CONTENT_MAX,
} from '../config/collector-http.js';

export class SeoCollector extends BaseCollector {
  get key() { return 'seo_meta'; }
  get phase() { return 3; }

  async collect(auditId: string, companyUrl: string, ctx?: CollectorCollectContext) {
    if (auditSkipsPublicWebsiteFetches(ctx?.noPublicWebsite, companyUrl)) {
      return {
        no_crawl_data: true,
        warning: 'No public website — SEO checks skipped',
        robots_txt: { exists: false, content: null, issues: ['No public website URL on file'] },
        sitemap: {
          exists: false,
          url: null,
          url_count: 0,
          format: null,
          sitemaps_fetched: 0,
          sitemap_index: false,
        },
        open_graph: { pages_with_structured_data: 0, total_pages: 0, structured_data_types: [] },
        page_analysis: {
          issues: [],
          meta_coverage: { with_title: 0, with_description: 0, with_h1: 0, total: 0 },
          image_stats: { total: 0, missing_alt: 0 },
        },
        total_pages: 0,
      };
    }

    try {
      await validatePublicAuditUrl(companyUrl);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        return {
          no_crawl_data: true,
          warning: 'Target URL is not allowed for outbound requests',
          robots_txt: { exists: false, content: null, issues: [] },
          sitemap: {
            exists: false,
            url: null,
            url_count: 0,
            format: null,
            sitemaps_fetched: 0,
            sitemap_index: false,
          },
          open_graph: { pages_with_structured_data: 0, total_pages: 0, structured_data_types: [] },
          page_analysis: { issues: [], meta_coverage: { with_title: 0, with_description: 0, with_h1: 0, total: 0 }, image_stats: { total: 0, missing_alt: 0 } },
          total_pages: 0,
        };
      }
      throw e;
    }

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
        ...(await this.fetchRobotsAndSitemap(companyUrl)),
        open_graph: { pages_with_structured_data: 0, total_pages: 0, structured_data_types: [] },
        page_analysis: { issues: ['No pages were crawled — cannot assess on-page SEO'], meta_coverage: { with_title: 0, with_description: 0, with_h1: 0, total: 0 }, image_stats: { total: 0, missing_alt: 0 } },
        total_pages: 0,
      };
    }

    const { robots_txt: robotsTxt, sitemap } = await this.fetchRobotsAndSitemap(companyUrl);
    const openGraph = this.analyzeOpenGraph(pages);

    const pageAnalysis = this.analyzePages(pages);

    return {
      robots_txt: robotsTxt,
      sitemap,
      open_graph: openGraph,
      page_analysis: pageAnalysis,
      total_pages: pages.length,
    };
  }

  /**
   * robots-parser for directives; discoverSitemaps for recursive urlset / sitemap index (bounded).
   */
  private async fetchRobotsAndSitemap(companyUrl: string) {
    const baseUrl = new URL(companyUrl);
    const robotsResourceUrl = `${baseUrl.origin}/robots.txt`;

    try {
      const response = await fetchPublicHttpUrl(robotsResourceUrl, {
        headers: { 'User-Agent': AUDIT_ROBOTS_USER_AGENT },
        signal: AbortSignal.timeout(COLLECTOR_SEO_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const sm = await discoverSitemaps(baseUrl.origin, null, robotsResourceUrl);
        return {
          robots_txt: { exists: false, content: null, issues: ['No robots.txt found'] as string[] },
          sitemap: this.formatSitemapResult(sm),
        };
      }

      const content = await response.text();
      const robot = robotsParser(robotsResourceUrl, content);
      const issues: string[] = [];

      if (robot.getSitemaps().length === 0) {
        issues.push('robots.txt does not declare a Sitemap: directive');
      }

      const home = new URL('/', baseUrl.origin).href;
      if (robot.isDisallowed(home, AUDIT_ROBOTS_USER_AGENT) === true) {
        issues.push('robots.txt disallows the site root for the audit crawler user-agent');
      }

      const sm = await discoverSitemaps(baseUrl.origin, content, robotsResourceUrl);

      return {
        robots_txt: {
          exists: true,
          content: content.substring(0, COLLECTOR_SEO_ROBOTS_CONTENT_MAX),
          issues,
        },
        sitemap: this.formatSitemapResult(sm),
      };
    } catch {
      const sm = await discoverSitemaps(baseUrl.origin, null, robotsResourceUrl);
      return {
        robots_txt: { exists: false, content: null, issues: ['Failed to fetch robots.txt'] },
        sitemap: this.formatSitemapResult(sm),
      };
    }
  }

  private formatSitemapResult(sm: Awaited<ReturnType<typeof discoverSitemaps>>) {
    return {
      exists: sm.exists,
      url: sm.url,
      url_count: sm.url_count,
      format: sm.format,
      sitemaps_fetched: sm.sitemaps_fetched,
      sitemap_index: sm.had_index,
    };
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
