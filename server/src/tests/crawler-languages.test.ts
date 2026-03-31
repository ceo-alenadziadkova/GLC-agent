import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {},
}));

import { detectLanguagesFromPages, extractLanguagesFromHtml } from '../lib/language-utils.js';

describe('CrawlerCollector language detection', () => {
  it('extracts languages from html lang and hreflang attributes', () => {
    const html = `
      <html lang="es-ES">
        <head>
          <link rel="alternate" hreflang="en-US" href="https://example.com/en" />
          <link rel="alternate" hreflang="de-DE" href="https://example.com/de" />
        </head>
      </html>
    `;

    const langs = extractLanguagesFromHtml(html);
    expect(langs.sort()).toEqual(['de', 'en', 'es']);
  });

  it('keeps language detection working after html is stripped from cached pages', () => {
    const pagesFromCache = [
      { url: 'https://example.com', detected_languages: ['es', 'en'] },
      { url: 'https://example.com/de', detected_languages: ['de'] },
    ];

    const langs = detectLanguagesFromPages(pagesFromCache).sort();
    expect(langs).toEqual(['de', 'en', 'es']);
  });

  it('merges languages from detected_languages and html without duplicates', () => {
    const mixedPages = [
      {
        url: 'https://example.com',
        detected_languages: ['en', 'es'],
        html: '<html lang="es-ES"><link rel="alternate" hreflang="de-DE" href="/de" /></html>',
      },
      {
        url: 'https://example.com/en',
        detected_languages: ['en'],
        html: '<html lang="en-US"></html>',
      },
    ];

    const langs = detectLanguagesFromPages(mixedPages).sort();
    expect(langs).toEqual(['de', 'en', 'es']);
  });
});
