import { describe, it, expect } from 'vitest';
import {
  extractFacts,
  getGenericMarketingHero,
  getHeroPrimaryCtaCount,
  htmlLooksLikeClientShell,
} from '../snapshot/extract-facts.js';
import { SnapshotFactsSchema, type SiteProfile } from '../snapshot/types.js';
import { runSnapshotAudit } from '../snapshot/audit/run-audit.js';
import { runSiteProfile } from '../snapshot/classification/site-profile-runner.js';
import { resetClassificationRulesCache } from '../snapshot/classification/parse-rules.js';
import { resetAuditRulesCache } from '../snapshot/audit/parse-audit-rules.js';

const MINIMAL_HTML = `<!DOCTYPE html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acme Dental Care | Book Appointment</title>
<meta name="description" content="Family dentist and cosmetic dentistry in Springfield">
<link rel="canonical" href="https://example.com/">
<script type="application/ld+json">{"@type":"Dentist","name":"Acme Dental"}</script>
</head><body>
<header><nav><a href="/services">Services</a><a href="/contact">Contact</a></nav></header>
<main>
<h1>Cosmetic dentistry and family dental care</h1>
<p>We offer teeth whitening, implants, and routine checkups for your family.</p>
<a href="tel:+15551234567">Call us</a>
<button>Book appointment</button>
</main>
<footer><p>123 Main St, Springfield</p></footer>
</body></html>`;

const SHOPIFY_HTML = `<!DOCTYPE html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Merch Co</title>
<meta name="description" content="Cool products shipped fast">
<link rel="canonical" href="https://store.example.com/">
<script src="https://cdn.shopify.com/s/files/1/shop.js"></script>
<script type="application/ld+json">{"@type":"Product","name":"Tee"}</script>
</head><body>
<main><h1>Spring collection</h1><button>Add to cart</button></main>
</body></html>`;

const SAAS_HTML = `<!DOCTYPE html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ledgerly — Cloud accounting</title>
<meta name="description" content="SaaS software for finance teams">
<link rel="canonical" href="https://app.example.com/">
</head><body>
<header><nav><a href="/pricing">Pricing</a><a href="/features">Features</a></nav></header>
<main><h1>Cloud accounting platform for growing teams</h1>
<button>Start free trial</button></main>
</body></html>`;

const REACT_SHELL_HTML = `<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`;

describe('snapshot engine', () => {
  it('htmlLooksLikeClientShell detects empty React-style mount', () => {
    expect(htmlLooksLikeClientShell(REACT_SHELL_HTML)).toBe(true);
    expect(htmlLooksLikeClientShell(MINIMAL_HTML)).toBe(false);
  });

  it('extractFacts + schema parses', () => {
    const facts = extractFacts(
      [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
      'https://example.com/',
    );
    const parsed = SnapshotFactsSchema.safeParse(facts);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schema.types).toContain('Dentist');
      expect(parsed.data.siteText.h1).toContain('dental');
    }
  });

  it('extractFacts merges title tokens from extra pages into slugs', () => {
    const page2 = `<!DOCTYPE html><html lang="en"><head>
<title>Smith Legal — Attorneys at Law</title>
</head><body><h1>Welcome</h1></body></html>`;
    const facts = extractFacts(
      [
        { url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' },
        { url: 'https://example.com/team', html: page2, status: 200, finalUrl: 'https://example.com/team' },
      ],
      'https://example.com/',
    );
    expect(facts.urls.slugs).toContain('attorneys');
    expect(facts.urls.slugs).toContain('legal');
  });

  it('compat getters keep stable fallback behavior', () => {
    const facts = extractFacts(
      [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
      'https://example.com/',
    );
    expect(getHeroPrimaryCtaCount(facts)).toBeGreaterThanOrEqual(0);
    expect(typeof getGenericMarketingHero(facts)).toBe('boolean');
  });

  it('runSnapshotAudit returns 0-100 and categories', () => {
    resetAuditRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const { audit } = runSnapshotAudit(facts);
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
    expect(audit.categoryScores.ux_clarity).toBeDefined();
    expect(audit.categoryScores.technical_basics).toBeDefined();
  });

  it('runSnapshotAudit scan_basis mentions page sample when scanMeta provided', () => {
    resetAuditRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const { audit } = runSnapshotAudit(facts, undefined, { pagesFetched: 2, maxPagesPlanned: 4 });
    expect(audit.scanBasis).toContain('Sample of 2');
    expect(audit.scanBasis).toContain('4');
    expect(audit.scanBasisCode).toBe('homepage_plus_core_pages');
  });

  it('runSnapshotAudit sets scan_basis_code homepage_only for single page when meta has matching counts', () => {
    resetAuditRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const { audit } = runSnapshotAudit(facts, undefined, {
      pagesFetched: 1,
      maxPagesPlanned: 4,
      playwrightUsed: false,
    });
    expect(audit.scanBasisCode).toBe('homepage_only');
  });

  it('runSiteProfile picks local-business signals', () => {
    resetClassificationRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const { profile, debug } = runSiteProfile(facts);
    expect(profile.siteType).toBeTruthy();
    expect(profile.classificationConfidenceBand).toMatch(/high|medium|low/);
    expect(typeof debug.tieAmbiguous).toBe('boolean');
  });

  it('runSiteProfile classifies Shopify-style page as ecommerce', () => {
    resetClassificationRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [
          {
            url: 'https://store.example.com/',
            html: SHOPIFY_HTML,
            status: 200,
            finalUrl: 'https://store.example.com/',
          },
        ],
        'https://store.example.com/',
      ),
    );
    const { profile, debug } = runSiteProfile(facts);
    expect(profile.siteType).toBe('ecommerce');
    expect(debug.rejectedSignals.length).toBeGreaterThanOrEqual(0);
  });

  it('runSiteProfile classifies SaaS-style page as saas', () => {
    resetClassificationRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [
          {
            url: 'https://app.example.com/',
            html: SAAS_HTML,
            status: 200,
            finalUrl: 'https://app.example.com/',
          },
        ],
        'https://app.example.com/',
      ),
    );
    const { profile } = runSiteProfile(facts);
    expect(profile.siteType).toBe('saas');
    expect(facts.urls.slugs).toContain('pricing');
    expect(facts.urls.slugs).toContain('features');
  });

  it('runSnapshotAudit matches unknown siteType when profile is not gated differently', () => {
    resetAuditRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const { profile } = runSiteProfile(facts);
    const withoutProfile = runSnapshotAudit(facts);
    const withProfile = runSnapshotAudit(facts, profile);
    expect(withProfile.audit.ruleResults.length).toBe(withoutProfile.audit.ruleResults.length);
    expect(withProfile.audit.overallScore).toBe(withoutProfile.audit.overallScore);
    expect(withProfile.audit.rulesCatalogVersion).toBe(4);
  });

  it('runSnapshotAudit omits YAML-gated rules for content-media', () => {
    resetAuditRulesCache();
    const facts = SnapshotFactsSchema.parse(
      extractFacts(
        [{ url: 'https://example.com/', html: MINIMAL_HTML, status: 200, finalUrl: 'https://example.com/' }],
        'https://example.com/',
      ),
    );
    const syntheticMedia: SiteProfile = {
      siteType: 'content-media',
      industry: 'unknown',
      conversionModel: 'unknown',
      primaryOffer: 'Blog',
      shortLabel: 'content-media',
      audienceGuess: 'unknown',
      businessSignals: [],
      classificationConfidence: 0.4,
      classificationConfidenceBand: 'low',
      companyNameGuess: null,
      locationGuess: null,
    };
    const full = runSnapshotAudit(facts);
    const gated = runSnapshotAudit(facts, syntheticMedia);
    expect(full.audit.ruleResults.length).toBe(36);
    expect(gated.audit.ruleResults.length).toBe(34);
    expect(gated.audit.ruleResults.some(r => r.id === 'CV05')).toBe(false);
    expect(gated.audit.ruleResults.some(r => r.id === 'CV08')).toBe(false);
  });
});
