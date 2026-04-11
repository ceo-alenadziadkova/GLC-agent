/**
 * Public marketing brief → recommended SPA route. Tunable without editing the route handler.
 * Urgency matching is substring-based (lowercase). Override substrings with
 * `MARKETING_BRIEF_EXPRESS_URGENCY_JSON` (JSON array of non-empty strings, 1–50 entries).
 */

import { z } from 'zod';

export const MARKETING_BRIEF_ALLOWED_ROUTES = ['/snapshot', '/express-audit', '/audit', '/discovery'] as const;
export type MarketingBriefRoute = (typeof MARKETING_BRIEF_ALLOWED_ROUTES)[number];

const ROUTE_SET = new Set<string>(MARKETING_BRIEF_ALLOWED_ROUTES);

export function isAllowedMarketingBriefRoute(r: string): r is MarketingBriefRoute {
  return ROUTE_SET.has(r);
}

const DEFAULT_EXPRESS_URGENCY_SUBSTRINGS = ['urgent', '2 weeks', 'two weeks'] as const;

const expressUrgencyEnvSchema = z.array(z.string().min(1)).min(1).max(50);

function loadMarketingBriefExpressUrgencySubstrings(): readonly string[] {
  const raw = process.env.MARKETING_BRIEF_EXPRESS_URGENCY_JSON?.trim();
  if (!raw) {
    return [...DEFAULT_EXPRESS_URGENCY_SUBSTRINGS];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    throw new Error(
      `[server] MARKETING_BRIEF_EXPRESS_URGENCY_JSON must be valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const result = expressUrgencyEnvSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues.map((i) => i.message).join('; ');
    throw new Error(`[server] Invalid MARKETING_BRIEF_EXPRESS_URGENCY_JSON: ${detail}`);
  }
  return result.data;
}

/** Matched case-insensitively as substrings of the `urgency` field → `/express-audit`. */
export const MARKETING_BRIEF_EXPRESS_URGENCY_SUBSTRINGS: readonly string[] =
  loadMarketingBriefExpressUrgencySubstrings();

export function computeMarketingBriefRecommendedRoute(body: {
  unsure_choice: boolean;
  no_website: boolean;
  urgency: string;
}): MarketingBriefRoute {
  if (body.unsure_choice) return '/snapshot';
  if (body.no_website) return '/discovery';
  const u = body.urgency.toLowerCase();
  for (const s of MARKETING_BRIEF_EXPRESS_URGENCY_SUBSTRINGS) {
    if (u.includes(s)) return '/express-audit';
  }
  return '/audit';
}
