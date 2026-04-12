/**
 * Weak-signal tech hints for fast snapshot: JSON-LD prose, meta generator, SPA shell.
 * Not counted as confirmed fingerprinting (see TECH_PATTERNS / Wappalyzer rules).
 */
import * as cheerio from 'cheerio';
import { TECH_TENTATIVE_MAX_HINTS } from '../config/tech-tentative-limits.js';

export type TechStackTentativeItem = {
  name: string;
  category: string;
  /** One-line reason for API consumers (English). */
  signal: string;
};

const SIGNAL_LD =
  'Mentioned in JSON-LD or structured metadata only — not matched on script URLs in this quick scan.';
const SIGNAL_GENERATOR =
  'Reported by a meta generator tag — not cross-checked against script sources in this scan.';
const SIGNAL_SPA =
  'A bundled JavaScript app was detected (type=module entry); frameworks may live inside minified files we do not fully inspect here.';

function confirmedKeySet(techStack: Record<string, string[]>): Set<string> {
  const s = new Set<string>();
  for (const arr of Object.values(techStack)) {
    for (const name of arr) {
      s.add(name.toLowerCase().trim());
    }
  }
  return s;
}

function blocksTentative(confirmed: Set<string>, tentativeName: string): boolean {
  const t = tentativeName.toLowerCase();
  if (confirmed.has(t)) return true;
  for (const c of confirmed) {
    if (c === t) return true;
    if (t.length >= 4 && (c.includes(t) || t.includes(c))) return true;
  }
  return false;
}

function extractLdJsonBlob(html: string): string {
  const $ = cheerio.load(html);
  const parts: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    parts.push($(el).text());
  });
  return parts.join('\n');
}

/** Keywords in JSON-LD only (reduces noise from unrelated body copy). */
const LD_TECH_HINTS: Array<{ name: string; category: string; re: RegExp }> = [
  { name: 'React', category: 'frameworks', re: /\bReact(?:\.js)?\b/ },
  { name: 'Vue.js', category: 'frameworks', re: /\bVue\.js\b/ },
  { name: 'Angular', category: 'frameworks', re: /\bAngular\b/ },
  { name: 'Svelte', category: 'frameworks', re: /\bSvelte\b/ },
  { name: 'Next.js', category: 'frameworks', re: /\bNext\.js\b|\bNextJS\b/ },
  { name: 'Nuxt', category: 'frameworks', re: /\bNuxt\.js\b|\bNuxt\b/ },
  { name: 'TypeScript', category: 'frameworks', re: /\bTypeScript\b/ },
  { name: 'Gatsby', category: 'frameworks', re: /\bGatsby\b/ },
  { name: 'Astro', category: 'frameworks', re: /\bAstro\b/ },
  { name: 'WordPress', category: 'cms', re: /\bWordPress\b/ },
  { name: 'Drupal', category: 'cms', re: /\bDrupal\b/ },
  { name: 'Shopify', category: 'ecommerce', re: /\bShopify\b/ },
];

const GENERATOR_HINTS: Array<{ name: string; category: string; re: RegExp }> = [
  { name: 'WordPress', category: 'cms', re: /wordpress/i },
  { name: 'Wix', category: 'cms', re: /\bwix\b/i },
  { name: 'Squarespace', category: 'cms', re: /squarespace/i },
  { name: 'Webflow', category: 'cms', re: /webflow/i },
  { name: 'Drupal', category: 'cms', re: /drupal/i },
  { name: 'Joomla', category: 'cms', re: /joomla/i },
];

function readGenerator(html: string): string | null {
  const $ = cheerio.load(html);
  const c = $('meta[name="generator"]').attr('content')?.trim();
  return c && c.length > 0 ? c : null;
}

function hasModuleEntryScript(html: string): boolean {
  return /<script[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=\s*["'][^"']+["']/i.test(html);
}

function frameworkLikeCount(stack: Record<string, string[]>): number {
  const fw = stack.frameworks ?? [];
  const cms = stack.cms ?? [];
  return fw.length + cms.length;
}

/**
 * Infer possible technologies from weak signals. Skips names already present in `tech_stack`.
 */
export function inferTechStackTentative(
  html: string,
  techStack: Record<string, string[]>,
): TechStackTentativeItem[] {
  const confirmed = confirmedKeySet(techStack);
  const out: TechStackTentativeItem[] = [];
  const seen = new Set<string>();

  const push = (name: string, category: string, signal: string) => {
    const key = `${category}:${name.toLowerCase()}`;
    if (seen.has(key)) return;
    if (blocksTentative(confirmed, name)) return;
    seen.add(key);
    out.push({ name, category, signal });
  };

  const ldBlob = extractLdJsonBlob(html);
  for (const row of LD_TECH_HINTS) {
    if (row.re.test(ldBlob)) {
      push(row.name, row.category, SIGNAL_LD);
    }
  }

  const gen = readGenerator(html);
  if (gen) {
    for (const row of GENERATOR_HINTS) {
      if (row.re.test(gen)) {
        push(row.name, row.category, SIGNAL_GENERATOR);
      }
    }
  }

  if (hasModuleEntryScript(html) && frameworkLikeCount(techStack) === 0) {
    push('Client-side SPA (bundled)', 'frameworks', SIGNAL_SPA);
  }

  return out.slice(0, TECH_TENTATIVE_MAX_HINTS);
}
