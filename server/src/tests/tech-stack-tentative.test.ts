import { describe, expect, it } from 'vitest';
import { inferTechStackTentative } from '../lib/tech-stack-tentative.js';

describe('inferTechStackTentative', () => {
  it('adds React and TypeScript from JSON-LD when not in confirmed stack', () => {
    const html = `
      <head>
      <script type="application/ld+json">{"keywords":["React Development","TypeScript"]}</script>
      <script type="module" src="/assets/index.abc123.js"></script>
      </head>`;
    const tech_stack = {
      analytics: ['Google Analytics 4'],
      frameworks: [],
      cms: [],
      hosting_cdn: [],
      chat_support: [],
      ecommerce: [],
      email_marketing: [],
      booking: [],
    };
    const hints = inferTechStackTentative(html, tech_stack);
    const names = hints.map(h => h.name);
    expect(names).toContain('React');
    expect(names).toContain('TypeScript');
  });

  it('skips tentative when already confirmed (case-insensitive)', () => {
    const html = `<script type="application/ld+json">{"text":"Built with React"}</script>`;
    const tech_stack = { frameworks: ['React'], cms: [], analytics: [], hosting_cdn: [], chat_support: [], ecommerce: [], email_marketing: [], booking: [] };
    const hints = inferTechStackTentative(html, tech_stack);
    expect(hints.some(h => h.name === 'React')).toBe(false);
  });

  it('adds SPA hint when module entry and no cms/framework confirmed', () => {
    const html = `<html><head><script type="module" src="/assets/x.js"></script></head></html>`;
    const tech_stack = {
      analytics: ['Google Tag Manager'],
      frameworks: [],
      cms: [],
      hosting_cdn: [],
      chat_support: [],
      ecommerce: [],
      email_marketing: [],
      booking: [],
    };
    const hints = inferTechStackTentative(html, tech_stack);
    expect(hints.some(h => h.name === 'Client-side SPA (bundled)')).toBe(true);
  });
});
