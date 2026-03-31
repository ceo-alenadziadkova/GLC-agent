export function extractLanguagesFromHtml(html: string): string[] {
  const langs = new Set<string>();

  const langMatch = html.match(/<html[^>]*\slang=["']([a-z]{2})(?:-[A-Z]{2})?["']/i);
  if (langMatch?.[1]) {
    langs.add(langMatch[1].toLowerCase());
  }

  const hreflangPattern = /hreflang=["']([a-z]{2})(?:-[A-Z]{2})?["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hreflangPattern.exec(html)) !== null) {
    if (match[1]) langs.add(match[1].toLowerCase());
  }

  return Array.from(langs);
}

type LanguagePageLike = {
  html?: string;
  detected_languages?: string[];
};

export function detectLanguagesFromPages(pages: LanguagePageLike[]): string[] {
  const langs = new Set<string>();

  for (const page of pages) {
    for (const lang of page.detected_languages ?? []) {
      langs.add(lang);
    }

    const html = page.html ?? '';
    for (const lang of extractLanguagesFromHtml(html)) {
      langs.add(lang);
    }
  }

  return Array.from(langs);
}
