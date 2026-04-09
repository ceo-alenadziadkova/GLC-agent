import type { IntakeBriefCollectionMode } from '../types/audit.js';
import { resolveExpressSlaRequiredIds, resolveFullSlaRequiredIds } from '../intake/brief-gates.js';

/**
 * Self-serve + live website: satisfies full product SLA (all visible required stubs + a10).
 */
export function makeWebsitePathFullBrief(
  collectionMode?: IntakeBriefCollectionMode,
): Record<string, unknown> {
  const r: Record<string, unknown> = {
    a10: 'Lead generation',
    a1: 'We sell eco goods online.',
    a2: 'Retail',
    a3: 'Germany',
    a5: 'Yes, multi-page site',
    a6: 'Yes',
    a7: 'Growing fast',
    b1: 'Urban shoppers 25–45',
    b2: ['Google / search'],
    b3: 'Fast delivery and fair prices',
    c5: 'Buy now',
    c6: 'Checkout is slow',
    c3: 'Yes, GA4',
    d1: ['Email', 'Spreadsheets'],
    d2: 'Copy-pasting orders into sheets',
    f1: 'Need more qualified traffic',
    f2: ['Website performance and technology (speed, stability, technical health)'],
  };
  const missing = resolveFullSlaRequiredIds(r, collectionMode).filter(id => !isFilled(r[id]));
  if (missing.length > 0) {
    throw new Error(`makeWebsitePathFullBrief missing SLA fields: ${missing.join(', ')}`);
  }
  return r;
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number' || typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
    return isFilled((v as { value: unknown }).value);
  }
  return false;
}

/** Express + website path — satisfies express SLA. */
export function makeWebsitePathExpressBrief(
  collectionMode?: IntakeBriefCollectionMode,
): Record<string, unknown> {
  const r: Record<string, unknown> = {
    a10: 'Lead generation',
    f1: 'Need more leads',
    b1: 'B2B buyers',
    a6: 'Yes',
    a5: 'Yes, multi-page site',
    c5: 'Contact us',
    c3: 'Yes, GA4',
  };
  const missing = resolveExpressSlaRequiredIds(r, collectionMode).filter(id => !isFilled(r[id]));
  if (missing.length > 0) {
    throw new Error(`makeWebsitePathExpressBrief missing SLA fields: ${missing.join(', ')}`);
  }
  return r;
}

