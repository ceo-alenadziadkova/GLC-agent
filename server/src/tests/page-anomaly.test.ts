import { describe, it, expect } from 'vitest';
import { detectPageAnomalies, anomalyLimitationMessages } from '../snapshot/page-anomaly.js';

describe('page-anomaly', () => {
  it('flags interstitial-style challenge HTML', () => {
    const det = detectPageAnomalies(
      '<html><body>Checking your browser before accessing example.com</body></html>',
      'https://example.com',
    );
    expect(det.challengeLikely).toBe(true);
    expect(det.challengeTaxonomy).toBe('generic_bot_interstitial');
    expect(anomalyLimitationMessages(det).length).toBeGreaterThan(0);
  });

  it('classifies Cloudflare signals before generic interstitial', () => {
    const det = detectPageAnomalies(
      '<html><head></head><body>Just a moment... cf-ray: 1234abcd</body></html>',
      'https://example.com',
    );
    expect(det.challengeLikely).toBe(true);
    expect(det.challengeTaxonomy).toBe('cloudflare');
  });

  it('flags parked / for-sale copy with taxonomy', () => {
    const det = detectPageAnomalies(
      '<html><body>This domain is for sale — submit your offer</body></html>',
      'https://parked.test',
    );
    expect(det.parkedLikely).toBe(true);
    expect(det.parkedTaxonomy).toBe('for_sale_or_aftermarket');
  });

  it('flags login wall from H1-only sign-in title', () => {
    const det = detectPageAnomalies(
      '<html><body><main><h1>Sign in</h1><form><input type="email"></form></main></body></html>',
      'https://app.example.com',
    );
    expect(det.loginWallLikely).toBe(true);
    expect(det.loginWallTaxonomy).toBe('signin_heading');
  });

  it('flags restricted-access copy', () => {
    const det = detectPageAnomalies(
      '<html><body><p>Access restricted to authorized users</p></body></html>',
      'https://intranet.example.com',
    );
    expect(det.loginWallLikely).toBe(true);
    expect(det.loginWallTaxonomy).toBe('auth_keyword_copy');
  });

  it('flags OAuth-style form action without login keywords', () => {
    const det = detectPageAnomalies(
      `<html><body><form action="https://tenant.okta.com/oauth/authorize"><input type="email" name="e"><button>Continue</button></form></body></html>`,
      'https://app.example.com',
    );
    expect(det.loginWallLikely).toBe(true);
    expect(det.loginWallTaxonomy).toBe('oauth_or_sso_form');
  });

  it('flags Namecheap-style parking on thin pages', () => {
    const det = detectPageAnomalies(
      '<html><body>This domain is registered at Namecheap</body></html>',
      'https://parked-nc.test',
    );
    expect(det.parkedLikely).toBe(true);
  });

  it('does not flag registrar name alone on long marketing pages (precision)', () => {
    const filler = `${'<p>lorem ipsum dolor sit amet.</p>\n'.repeat(400)}<footer>namecheap</footer>`;
    const det = detectPageAnomalies(`<html><body><main>${filler}</main></body></html>`, 'https://heavy-site.test');
    expect(det.parkedLikely).toBeUndefined();
  });

  it('does not treat registrar footer as parked when LocalBusiness JSON-LD + tel present (live SMB)', () => {
    const html = `<!DOCTYPE html><html><body>
<script type="application/ld+json">{"telephone":"+34-971-000-000","@type":"LocalBusiness","address":{"@type":"PostalAddress","streetAddress":"Carrer 1"}}</script>
<p>Plumber and heating services in Mallorca.</p>
<a href="/services">Services</a>
<a href="/contact">Contact</a>
<footer>Parking page powered by namecheap marketing</footer>
</body></html>`;
    const det = detectPageAnomalies(html, 'https://smallbiz.example/');
    expect(det.parkedLikely).toBeUndefined();
  });

  it('flags thin SPA shell with many scripts and root mount (no login keywords)', () => {
    const scripts = Array.from({ length: 11 }, (_, i) => `<script src="/c/${i}.js"></script>`).join('\n');
    const html = `<!DOCTYPE html><html><head>${scripts}</head><body><div id="root"></div></body></html>`;
    const det = detectPageAnomalies(html, 'https://app.example.com/');
    expect(det.loginWallLikely).toBe(true);
    expect(det.loginWallTaxonomy).toBe('spa_shell_thin_html');
  });

  it('does not flag SPA shell heuristic on content-rich static pages', () => {
    const scripts = Array.from({ length: 12 }, (_, i) => `<script src="/c/${i}.js"></script>`).join('\n');
    const para = '<p>' + 'word '.repeat(400) + '</p>';
    const html = `<!DOCTYPE html><html><head>${scripts}</head><body><div id="root">${para}</div></body></html>`;
    const det = detectPageAnomalies(html, 'https://site.example/');
    expect(det.loginWallTaxonomy).not.toBe('spa_shell_thin_html');
  });
});
