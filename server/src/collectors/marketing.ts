import { BaseCollector } from './base.js';
import { supabase } from '../services/supabase.js';

/**
 * Marketing Collector — extracts observable marketing signals from crawled pages.
 * Blog posts, testimonials, trust badges, email signup forms, CTAs, social links.
 */
export class MarketingCollector extends BaseCollector {
  get key() { return 'marketing_signals'; }
  get phase() { return 5; }

  async collect(auditId: string, _companyUrl: string) {
    // Pull crawled data
    const { data: crawlData } = await supabase
      .from('collected_data')
      .select('data')
      .eq('audit_id', auditId)
      .eq('collector_key', 'crawler')
      .single();

    const pages = (crawlData?.data as Record<string, unknown>)?.pages_crawled as Array<Record<string, unknown>> ?? [];
    const techStack = (crawlData?.data as Record<string, unknown>)?.tech_stack as Record<string, string[]> ?? {};
    const socialProfiles = (crawlData?.data as Record<string, unknown>)?.social_profiles as Record<string, string> ?? {};
    const contactInfo = (crawlData?.data as Record<string, unknown>)?.contact_info as Record<string, string[]> ?? {};

    // Pull recon for company context
    const { data: recon } = await supabase
      .from('audit_recon')
      .select('company_name, industry, languages')
      .eq('audit_id', auditId)
      .single();

    const allTitles = pages.map(p => (p.title as string) ?? '').filter(Boolean);
    const allH1s = pages.flatMap(p => (p.h1 as string[]) ?? []);
    const allH2s = pages.flatMap(p => (p.h2 as string[]) ?? []);
    const allMeta = pages.map(p => (p.meta_description as string) ?? '').filter(Boolean);
    const allText = [...allTitles, ...allH1s, ...allH2s, ...allMeta].map(t => t.toLowerCase());

    // Blog post detection
    const BLOG_WORDS = ['blog', 'article', 'post', 'news', 'insight', 'guide', 'tip', 'noticia', 'artículo'];
    const blogPages = pages.filter(p => {
      const url = (p.url as string) ?? '';
      const title = ((p.title as string) ?? '').toLowerCase();
      return BLOG_WORDS.some(w => url.includes(w) || title.includes(w));
    });

    // Testimonial / review detection
    const TESTIMONIAL_WORDS = ['testimonial', 'review', 'opinion', 'what our', 'what clients', 'customer say',
      'testimonio', 'reseña', 'opinión', 'nuestros clientes'];
    const testimonialCount = allText.filter(t => TESTIMONIAL_WORDS.some(w => t.includes(w))).length;

    // Trust badge / certification signals
    const TRUST_WORDS = ['award', 'certified', 'iso', 'tripadvisor', 'booking.com', 'google partner',
      'partner', 'accredited', 'certificate', 'reconocimiento', 'certificado'];
    const certificationCount = allText.filter(t => TRUST_WORDS.some(w => t.includes(w))).length;

    // Email/newsletter signup detection
    const NEWSLETTER_WORDS = ['newsletter', 'subscribe', 'email us', 'sign up', 'join our', 'suscríbete',
      'boletín', 'suscribirse'];
    const newsletterDetected = allText.some(t => NEWSLETTER_WORDS.some(w => t.includes(w)));

    // Lead magnet detection
    const LEAD_MAGNET_WORDS = ['free', 'download', 'ebook', 'guide', 'checklist', 'template', 'webinar',
      'gratis', 'descarga', 'guía'];
    const leadMagnetDetected = allText.some(t => LEAD_MAGNET_WORDS.some(w => t.includes(w)));

    // Value proposition quality — score the H1 of the homepage
    const homepagePage = pages.find(p => {
      const url = (p.url as string) ?? '';
      try { return new URL(url).pathname === '/' || new URL(url).pathname === ''; } catch { return false; }
    }) ?? pages[0];
    const homepageH1 = ((homepagePage?.h1 as string[]) ?? [])[0] ?? null;
    const homepageMeta = (homepagePage?.meta_description as string) ?? null;

    // Social profile count and platforms
    const socialPlatforms = Object.keys(socialProfiles).filter(k => socialProfiles[k]);

    // Email marketing stack
    const emailMarketingStack = techStack.email_marketing ?? [];

    // Contact info richness
    const hasEmailContact = (contactInfo.emails ?? []).length > 0;
    const hasPhoneContact = (contactInfo.phones ?? []).length > 0;

    return {
      pages_analyzed: pages.length,
      // Blog
      blog_post_count: blogPages.length,
      blog_page_samples: blogPages.slice(0, 3).map(p => ({ url: p.url, title: p.title })),
      // Trust signals
      testimonial_count: testimonialCount,
      certifications_count: certificationCount,
      // Lead generation
      newsletter_detected: newsletterDetected,
      lead_magnet_detected: leadMagnetDetected,
      email_marketing_stack: emailMarketingStack,
      has_email_contact: hasEmailContact,
      has_phone_contact: hasPhoneContact,
      // Social presence
      social_profiles_count: socialPlatforms.length,
      social_platforms: socialPlatforms,
      // Value proposition
      homepage_h1: homepageH1,
      homepage_meta_description: homepageMeta,
      // Context
      company_name: recon?.company_name ?? null,
      industry: recon?.industry ?? null,
      languages_detected: (recon?.languages as string[]) ?? [],
    };
  }
}
