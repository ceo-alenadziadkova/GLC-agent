import type { DomainKey } from '../types/audit.js';
import { DOMAIN_KEYS } from '../types/audit.js';

type WeightMap = Record<DomainKey, number>;

/**
 * Industry-specific weight multipliers for domain scores.
 * Default weight is 1.0. Higher = more important for this industry.
 * Overall score = sum(score * weight) / sum(weight).
 *
 * Override at runtime with `INDUSTRY_WEIGHTS_JSON` (merge over these defaults per industry key).
 * Keys must match normalized industry slugs (lowercase, spaces/`&` → `_`), same as `getDomainWeight`.
 * Example:
 *   INDUSTRY_WEIGHTS_JSON={"healthcare":{"security_compliance":1.8,"seo_digital":1.1}}
 */
export const INDUSTRY_WEIGHTS_DEFAULT: Record<string, Partial<WeightMap>> = {
  hospitality: {
    ux_conversion: 1.5,
    seo_digital: 1.4,
    marketing_utp: 1.3,
    tech_infrastructure: 0.8,
    automation_processes: 0.7,
  },
  real_estate: {
    seo_digital: 1.5,
    ux_conversion: 1.3,
    marketing_utp: 1.4,
    security_compliance: 1.1,
  },
  marine: {
    marketing_utp: 1.4,
    seo_digital: 1.3,
    ux_conversion: 1.2,
    automation_processes: 0.8,
  },
  healthcare: {
    security_compliance: 1.6,
    ux_conversion: 1.3,
    tech_infrastructure: 1.2,
    automation_processes: 1.1,
  },
  food_beverage: {
    seo_digital: 1.4,
    ux_conversion: 1.3,
    marketing_utp: 1.3,
    automation_processes: 1.2,
  },
  retail: {
    ux_conversion: 1.5,
    seo_digital: 1.4,
    automation_processes: 1.3,
    marketing_utp: 1.2,
  },
  professional_services: {
    marketing_utp: 1.4,
    seo_digital: 1.3,
    security_compliance: 1.2,
    tech_infrastructure: 1.1,
  },
  technology: {
    tech_infrastructure: 1.5,
    security_compliance: 1.4,
    automation_processes: 1.3,
    ux_conversion: 1.1,
  },
};

const DOMAIN_KEY_SET = new Set<string>(DOMAIN_KEYS);

function sanitizeWeightMap(raw: unknown): Partial<WeightMap> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Partial<WeightMap> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!DOMAIN_KEY_SET.has(k)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      out[k as DomainKey] = n;
    }
  }
  return out;
}

function parseIndustryWeightsJson(): Record<string, Partial<WeightMap>> | null {
  const raw = process.env.INDUSTRY_WEIGHTS_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, Partial<WeightMap>>;
  } catch {
    return null;
  }
}

function mergeIndustryWeights(
  base: Record<string, Partial<WeightMap>>,
  override: Record<string, Partial<WeightMap>> | null,
): Record<string, Partial<WeightMap>> {
  if (!override) return base;
  const out: Record<string, Partial<WeightMap>> = { ...base };
  for (const [industryKey, partial] of Object.entries(override)) {
    const clean = sanitizeWeightMap(partial);
    if (Object.keys(clean).length === 0) continue;
    out[industryKey] = { ...(base[industryKey] ?? {}), ...clean };
  }
  return out;
}

/** Effective map after `INDUSTRY_WEIGHTS_JSON` merge (read-only for callers). */
export const INDUSTRY_WEIGHTS: Record<string, Partial<WeightMap>> = mergeIndustryWeights(
  INDUSTRY_WEIGHTS_DEFAULT,
  parseIndustryWeightsJson(),
);

const DEFAULT_WEIGHT = 1.0;

/**
 * Get the weight for a specific domain in a specific industry.
 */
export function getDomainWeight(industry: string | null, domainKey: DomainKey): number {
  if (!industry) return DEFAULT_WEIGHT;

  const normalized = industry.toLowerCase().replace(/[& ]/g, '_');
  const weights = INDUSTRY_WEIGHTS[normalized];

  return weights?.[domainKey] ?? DEFAULT_WEIGHT;
}

/**
 * Calculate weighted overall score from domain scores.
 */
export function calculateWeightedScore(
  domainScores: Array<{ domain_key: DomainKey; score: number }>,
  industry: string | null,
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { domain_key, score } of domainScores) {
    const weight = getDomainWeight(industry, domain_key);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
