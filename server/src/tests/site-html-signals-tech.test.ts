import { describe, expect, it } from 'vitest';
import { detectTechStackRecord } from '../lib/site-html-signals.js';

function stack(html: string) {
  return detectTechStackRecord(html);
}

describe('site-html-signals tech stack (reduced false positives)', () => {
  it('does not flag Magento from generic "image" or unrelated copy', () => {
    const s = stack('<p>Our image gallery and storage module</p>');
    expect(s.cms).not.toContain('Magento');
  });

  it('flags Magento when storefront markers appear', () => {
    const s = stack('<script type="text/x-magento-init">{"*":{}}</script>');
    expect(s.cms).toContain('Magento');
  });

  it('does not flag Angular from arbitrary "ng-" classes alone', () => {
    const s = stack('<div class="ng-padding-left">x</div>');
    expect(s.frameworks).not.toContain('Angular');
  });

  it('flags Angular when runtime markers appear', () => {
    const s = stack('<app-root ng-version="18.0.0"></app-root>');
    expect(s.frameworks).toContain('Angular');
  });

  it('does not flag Cloudflare from cdnjs library URLs', () => {
    const s = stack('<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>');
    expect(s.hosting_cdn).not.toContain('Cloudflare');
  });

  it('flags Cloudflare proxy / security / analytics scripts', () => {
    const s = stack('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>');
    expect(s.hosting_cdn).toContain('Cloudflare');
  });

  it('flags Cloudflare from non-cdnjs cloudflare image URLs (Wappalyzer-style DOM)', () => {
    const s = stack('<img src="https://cdn.cloudflare.com/something/logo.png" alt="" />');
    expect(s.hosting_cdn).toContain('Cloudflare');
  });

  it('does not label Google Fonts / gstatic as Google Cloud', () => {
    const s = stack('<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"/>');
    expect(s.hosting_cdn).not.toContain('Google Cloud');
    expect(s.hosting_cdn).toContain('Google Fonts');
  });

  it('flags GCP-style endpoints as Google Cloud', () => {
    const s = stack('<script src="https://us-central1-myproj.cloudfunctions.net/hello"></script>');
    expect(s.hosting_cdn).toContain('Google Cloud');
  });

  it('flags Netlify from domain and common embeds', () => {
    const s = stack('<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>');
    expect(s.hosting_cdn).toContain('Netlify');
  });

  it('flags Netlify from page URL host (Wappalyzer-style url channel)', () => {
    const s = detectTechStackRecord('<html><body>ok</body></html>', {
      pageUrls: ['https://my-site.netlify.app/'],
    });
    expect(s.hosting_cdn).toContain('Netlify');
  });

  it('flags React from typical client bootstrap snippet', () => {
    const s = stack(
      '<script type="module">import { createRoot } from "/assets/index.js";createRoot(document.getElementById("root"));</script>',
    );
    expect(s.frameworks).toContain('React');
  });

  it('flags React from Vite modulepreload chunk names', () => {
    const s = stack(
      '<link rel="modulepreload" href="/assets/react-dom_client-CDSpZWIA.js"/>',
    );
    expect(s.frameworks).toContain('React');
  });

  it('flags GitHub Pages from page URL (Wappalyzer-style)', () => {
    const s = detectTechStackRecord('<html><body>x</body></html>', {
      pageUrls: ['https://acme.github.io/docs/'],
    });
    expect(s.hosting_cdn).toContain('GitHub Pages');
  });

  it('flags Calendly embed from script src', () => {
    const s = stack('<script src="https://assets.calendly.com/assets/external/widget.js"></script>');
    expect(s.booking).toContain('Calendly');
  });

  it('flags Segment from CDN script', () => {
    const s = stack('<script src="https://cdn.segment.com/analytics.js/v1/xxx/analytics.min.js"></script>');
    expect(s.analytics).toContain('Segment');
  });
});
