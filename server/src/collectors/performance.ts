import { BaseCollector } from './base.js';
import { supabase } from '../services/supabase.js';
import { PublicUrlNotAllowedError, fetchPublicHttpUrl, validatePublicAuditUrl } from '../lib/public-http-url.js';

export class PerformanceCollector extends BaseCollector {
  get key() { return 'performance'; }
  get phase() { return 1; }

  async collect(auditId: string, companyUrl: string) {
    try {
      await validatePublicAuditUrl(companyUrl);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        return {
          no_crawl_data: true,
          warning: 'Target URL is not allowed for outbound requests',
          headers: { compression: { enabled: false, type: null }, caching: { cache_control: null, etag: false, last_modified: false, has_cache_policy: false }, https_available: false, cdn_detected: false, server: null },
          page_weights: { avg_content_length_bytes: 0, avg_load_time_ms: 0, heaviest_page: null, slowest_page: null, total_images: 0, lazy_loaded_images: 0, lazy_load_coverage: 100 },
          total_pages_analyzed: 0,
        };
      }
      throw e;
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
      const headerAnalysis = await this.analyzeHeaders(companyUrl);
      return {
        no_crawl_data: true,
        warning: 'No crawled pages available — page weight analysis skipped',
        headers: headerAnalysis,
        page_weights: { avg_content_length_bytes: 0, avg_load_time_ms: 0, heaviest_page: null, slowest_page: null, total_images: 0, lazy_loaded_images: 0, lazy_load_coverage: 100 },
        total_pages_analyzed: 0,
      };
    }

    // Check response headers for caching/compression
    const headerAnalysis = await this.analyzeHeaders(companyUrl);

    // Analyze page weights
    const pageWeights = this.analyzePageWeights(pages);

    return {
      headers: headerAnalysis,
      page_weights: pageWeights,
      total_pages_analyzed: pages.length,
    };
  }

  private async analyzeHeaders(url: string) {
    try {
      const response = await fetchPublicHttpUrl(url, {
        headers: { 'User-Agent': 'GLC-AuditBot/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      const headers = response.headers;

      return {
        compression: {
          enabled: !!headers.get('content-encoding'),
          type: headers.get('content-encoding') ?? null,
        },
        caching: {
          cache_control: headers.get('cache-control') ?? null,
          etag: !!headers.get('etag'),
          last_modified: !!headers.get('last-modified'),
          has_cache_policy: !!(headers.get('cache-control') || headers.get('etag')),
        },
        https_available: response.url.startsWith('https://'),
        cdn_detected: !!(
          headers.get('cf-ray') ||
          headers.get('x-vercel-id') ||
          headers.get('x-amz-cf-id') ||
          headers.get('x-cdn')
        ),
        server: headers.get('server') ?? null,
      };
    } catch {
      return { compression: { enabled: false, type: null }, caching: { cache_control: null, etag: false, last_modified: false, has_cache_policy: false }, https_available: false, cdn_detected: false, server: null };
    }
  }

  private analyzePageWeights(pages: Array<Record<string, unknown>>) {
    const weights = pages.map(p => ({
      url: p.url as string,
      content_length: (p.content_length as number) ?? 0,
      load_time_ms: (p.load_time_ms as number) ?? 0,
      images: p.images as { total: number; lazy_loaded: number } | undefined,
    }));

    const avgContentLength = weights.length > 0
      ? Math.round(weights.reduce((s, w) => s + w.content_length, 0) / weights.length)
      : 0;

    const avgLoadTime = weights.length > 0
      ? Math.round(weights.reduce((s, w) => s + w.load_time_ms, 0) / weights.length)
      : 0;

    const totalImages = weights.reduce((s, w) => s + (w.images?.total ?? 0), 0);
    const lazyLoadedImages = weights.reduce((s, w) => s + (w.images?.lazy_loaded ?? 0), 0);

    return {
      avg_content_length_bytes: avgContentLength,
      avg_load_time_ms: avgLoadTime,
      heaviest_page: weights.sort((a, b) => b.content_length - a.content_length)[0]?.url ?? null,
      slowest_page: weights.sort((a, b) => b.load_time_ms - a.load_time_ms)[0]?.url ?? null,
      total_images: totalImages,
      lazy_loaded_images: lazyLoadedImages,
      lazy_load_coverage: totalImages > 0 ? Math.round((lazyLoadedImages / totalImages) * 100) : 100,
    };
  }
}
