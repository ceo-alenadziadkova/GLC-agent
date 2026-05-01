import { describe, it, expect } from 'vitest';
import { RECON_CONSULTANT_HINTS_COPY_EN } from '../../config/recon-consultant-hints.en.js';
import {
  buildReconContextSummary,
  extractReconCrawlSignalsForSummary,
} from './recon-context-summary.service.js';

const baseReconResult = {
  company_name: 'Acme',
  industry: 'Healthcare',
  industry_subcategory: null,
  location: 'Palma',
  estimated_size: null,
  business_model: null,
  target_audience: null,
  key_services_products: [],
  value_proposition: null,
  competitive_landscape_notes: null,
  mallorca_relevance: null,
  initial_observations: ['Signal from intake only'],
  suggested_interview_questions: [],
};

describe('extractReconCrawlSignalsForSummary', () => {
  it('detects tech, social, and primary contact presence', () => {
    const out = extractReconCrawlSignalsForSummary({
      tech_stack: { cms: ['WordPress'] },
      social_profiles: { linkedin: 'https://example.com/in/x' },
      contact_info: { emails: ['a@b.co'], phones: [], addresses: [] },
    });
    expect(out.hasTechSignals).toBe(true);
    expect(out.hasSocialProfiles).toBe(true);
    expect(out.hasPrimaryContact).toBe(true);
  });
});

describe('buildReconContextSummary', () => {
  it('classifies website_crawl when pages exist', () => {
    const out = buildReconContextSummary({
      noPublicSite: false,
      crawledPageCount: 3,
      reconResult: baseReconResult,
      briefResponses: null,
      hasNewAuditSiteRecon: false,
    });
    expect(out.mode).toBe('website_crawl');
    expect(out.known_facts.some((x) => x.includes('Crawled pages: 3'))).toBe(true);
  });

  it('classifies idea_only from intake text', () => {
    const out = buildReconContextSummary({
      noPublicSite: true,
      crawledPageCount: 0,
      reconResult: baseReconResult,
      briefResponses: { q1: 'We have an idea for a new MVP concept' },
      hasNewAuditSiteRecon: false,
    });
    expect(out.mode).toBe('idea_only');
    expect(out.recommended_next_steps.length).toBeGreaterThan(0);
  });

  it('classifies problem_only from intake text', () => {
    const out = buildReconContextSummary({
      noPublicSite: true,
      crawledPageCount: 0,
      reconResult: baseReconResult,
      briefResponses: { q1: 'Major process bottleneck and problem with lead drop-off' },
      hasNewAuditSiteRecon: false,
    });
    expect(out.mode).toBe('problem_only');
    expect(out.missing_inputs).toContain('Public website URL or equivalent digital footprint');
  });

  it('adds consultant_hints for no-public-site context', () => {
    const out = buildReconContextSummary({
      noPublicSite: true,
      crawledPageCount: 0,
      reconResult: baseReconResult,
      briefResponses: { q1: 'We have an idea for a new MVP concept' },
      hasNewAuditSiteRecon: false,
    });
    expect(out.consultant_hints?.length).toBeGreaterThan(0);
    expect(out.consultant_hints).toContain(RECON_CONSULTANT_HINTS_COPY_EN.askPublicFootprint);
    expect(out.consultant_hints).toContain(RECON_CONSULTANT_HINTS_COPY_EN.modeIdeaDiscovery);
  });

  it('adds approval hint when crawl context is complete', () => {
    const recon = {
      ...baseReconResult,
      value_proposition: 'We help clinics book faster.',
      target_audience: 'Outpatient clinics in EU',
      key_services_products: ['Scheduling SaaS'],
    };
    const out = buildReconContextSummary({
      noPublicSite: false,
      crawledPageCount: 4,
      reconResult: recon,
      briefResponses: null,
      hasNewAuditSiteRecon: false,
      crawlSignals: {
        hasTechSignals: true,
        hasSocialProfiles: true,
        hasPrimaryContact: true,
      },
    });
    expect(out.mode).toBe('website_crawl');
    expect(out.missing_inputs.length).toBe(0);
    expect(out.consultant_hints).toContain(RECON_CONSULTANT_HINTS_COPY_EN.websiteApproveWithCorrections);
  });
});
