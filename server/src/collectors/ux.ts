import {
  COLLECTOR_UX_SAMPLE_CTAS_MAX,
  COLLECTOR_UX_SAMPLE_H1S_MAX,
} from '../config/collector-sampling-limits.js';
import { UX_VIEWPORT_EXPECTED_FRAMEWORK_LABELS } from '../config/ux-collector-heuristics.js';
import { BaseCollector, type CollectorCollectContext } from './base.js';
import { supabase } from '../services/supabase.js';
import { collectDomUxSignals } from '../lib/dom-ux-signals.js';

/**
 * UX Collector — extracts conversion signals, mobile readiness, and navigation
 * quality from crawled HTML. Complements the AccessibilityCollector.
 */
export class UxCollector extends BaseCollector {
  get key() { return 'ux_signals'; }
  get phase() { return 4; }

  async collect(auditId: string, companyUrl: string, _ctx?: CollectorCollectContext) {
    // Fetch crawled pages from cache (crawler always runs before UX in phase 4)
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
        warning: 'No crawled pages available — UX signal extraction skipped',
        viewport_meta_present: false,
        viewport_assessment_status: 'not_assessed',
        cta_count: 0,
        cta_assessment_status: 'not_assessed',
        form_count: 0,
        form_assessment_status: 'not_assessed',
        testimonial_indicators: 0,
        lang_attribute_present: false,
        heading_hierarchy_valid: false,
        pages_analyzed: 0,
      };
    }

    // We stored raw HTML in the crawler but strip it before caching pages.
    // Re-fetch the homepage HTML via the stored page titles/urls.
    // Since raw HTML is not cached, we analyse structural signals from the
    // crawled page metadata that IS stored.
    const allH1s = pages.flatMap(p => (p.h1 as string[]) ?? []);
    const allH2s = pages.flatMap(p => (p.h2 as string[]) ?? []);
    const allTitles = pages.map(p => p.title as string ?? '').filter(Boolean);

    // CTA detection: count H1/H2/title text containing action words
    const CTA_WORDS = [
      'contact', 'book', 'reserve', 'call', 'get', 'start', 'try', 'request',
      'buy', 'order', 'shop', 'sign up', 'subscribe', 'download', 'learn more',
      'contacta', 'reserva', 'llama', 'solicita', 'compra',
    ];
    const allText = [...allH1s, ...allH2s, ...allTitles].map(t => t.toLowerCase());
    const ctaCount = allText.filter(t => CTA_WORDS.some(w => t.includes(w))).length;

    // Form detection: pages with contact/booking in their title or H1
    const FORM_WORDS = ['contact', 'form', 'booking', 'appointment', 'quote', 'contacto', 'reserva'];
    const formCount = pages.filter(p => {
      const pageText = [...((p.h1 as string[]) ?? []), p.title as string ?? ''].join(' ').toLowerCase();
      return FORM_WORDS.some(w => pageText.includes(w));
    }).length;

    // Testimonial / trust signal indicators: page titles/H1s mentioning reviews, testimonials, clients
    const TRUST_WORDS = ['testimonial', 'review', 'client', 'customer', 'partner', 'award', 'certificat', 'trust'];
    const trustCount = pages.filter(p => {
      const pageText = [...((p.h1 as string[]) ?? []), p.title as string ?? ''].join(' ').toLowerCase();
      return TRUST_WORDS.some(w => pageText.includes(w));
    }).length;

    // Heading hierarchy: check if any page has H2s without H1
    const headingHierarchyValid = pages.every(p => {
      const h1 = (p.h1 as string[]) ?? [];
      const h2 = (p.h2 as string[]) ?? [];
      return h2.length === 0 || h1.length > 0; // if there are H2s, there should be an H1
    });

    // lang attribute: check if any page has structured_data (indicates proper HTML setup)
    // We can't check html[lang] without raw HTML, so we use languages_detected from recon
    const { data: recon } = await supabase
      .from('audit_recon')
      .select('languages')
      .eq('audit_id', auditId)
      .single();
    const langAttributePresent = ((recon?.languages as string[]) ?? []).length > 0;

    // Viewport meta: We infer from the tech_stack — modern frameworks (React/Next/Wix/Squarespace)
    // always include viewport. Vanilla HTML sites may not.
    const { data: crawlFull } = await supabase
      .from('collected_data')
      .select('data')
      .eq('audit_id', auditId)
      .eq('collector_key', 'crawler')
      .single();
    const techStack = (crawlFull?.data as Record<string, unknown>)?.tech_stack as Record<string, string[]> ?? {};
    const modernFrameworks = [
      ...(techStack.frameworks ?? []),
      ...(techStack.cms ?? []),
    ];
    const viewportExpected = new Set<string>(UX_VIEWPORT_EXPECTED_FRAMEWORK_LABELS);
    const viewportMetaPresent = modernFrameworks.some(f => viewportExpected.has(f));

    const domSignals = await collectDomUxSignals(companyUrl);
    const ctaCountFinal = domSignals?.cta_count ?? ctaCount;
    const formCountFinal = domSignals?.form_count ?? formCount;
    const viewportMetaPresentFinal = domSignals?.viewport_meta_present ?? viewportMetaPresent;
    const ctaAssessmentStatus: 'confirmed' | 'unverified' | 'not_assessed' =
      domSignals ? 'confirmed' : 'unverified';
    const formAssessmentStatus: 'confirmed' | 'unverified' | 'not_assessed' =
      domSignals ? 'confirmed' : 'unverified';
    const viewportAssessmentStatus: 'confirmed' | 'unverified' | 'not_assessed' =
      domSignals
        ? 'confirmed'
        : viewportMetaPresentFinal
          ? 'unverified'
          : 'unverified';

    return {
      pages_analyzed: pages.length,
      viewport_meta_present: viewportMetaPresentFinal,
      viewport_assessment_status: viewportAssessmentStatus,
      cta_count: ctaCountFinal,
      cta_assessment_status: ctaAssessmentStatus,
      form_count: formCountFinal,
      form_assessment_status: formAssessmentStatus,
      testimonial_indicators: trustCount,
      heading_hierarchy_valid: headingHierarchyValid,
      lang_attribute_present: langAttributePresent,
      cta_detection_method: domSignals ? 'headless_dom' : 'metadata_heuristic',
      viewport_detection_method: domSignals ? 'headless_dom' : 'framework_heuristic',
      total_h1s: allH1s.length,
      total_h2s: allH2s.length,
      pages_with_h1: pages.filter(p => ((p.h1 as string[]) ?? []).length > 0).length,
      pages_without_h1: pages.filter(p => ((p.h1 as string[]) ?? []).length === 0).length,
      sample_h1s: allH1s.slice(0, COLLECTOR_UX_SAMPLE_H1S_MAX),
      sample_ctas: allText.filter(t => CTA_WORDS.some(w => t.includes(w))).slice(0, COLLECTOR_UX_SAMPLE_CTAS_MAX),
    };
  }
}
