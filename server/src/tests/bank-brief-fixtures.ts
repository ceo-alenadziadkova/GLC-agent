import type { IntakeBriefCollectionMode } from '../types/audit.js';
import { resolveExpressSlaRequiredIds, resolveFullSlaRequiredIds } from '@glc/intake-core';

/**
 * Self-serve + live website: satisfies full product SLA (all visible required stubs + a10).
 */
export function makeWebsitePathFullBrief(
  collectionMode?: IntakeBriefCollectionMode,
): Record<string, unknown> {
  const r: Record<string, unknown> = {
    a11: 'https://example.com',
    a12: 'Eco Goods Ltd',
    a10: 'Lead generation / referrals',
    a1: 'We sell eco goods online.',
    a2: 'Retail',
    a3: 'Germany',
    a5: 'Yes, multi-page site',
    a6: 'Yes',
    a7: 'Growing fast',
    b1: 'Urban shoppers 25–45',
    b2: ['Google / search'],
    b3: 'Speed and convenience',
    c5: 'Buy now',
    c6: 'Checkout is slow',
    c3: 'Yes, GA4',
    d1: ['Email', 'Spreadsheets'],
    d2: 'Creating and sending quotes or invoices',
    f1: ['Not enough qualified leads or new customers'],
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

/** Wrap flat fixture values as persisted brief cells (API / saveBriefResponses). */
export function wrapBriefCellsClient(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      'value' in (v as Record<string, unknown>) &&
      'source' in (v as Record<string, unknown>)
    ) {
      out[k] = v;
    } else {
      out[k] = { value: v, source: 'client' as const };
    }
  }
  return out;
}

/** Express + website path — satisfies express SLA. */
export function makeWebsitePathExpressBrief(
  collectionMode?: IntakeBriefCollectionMode,
): Record<string, unknown> {
  const r: Record<string, unknown> = {
    a10: 'Lead generation / referrals',
    f1: ['Not enough qualified leads or new customers'],
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

