import type { DomainKey } from '@glc/intake-core';

import { GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY } from '../../config/director-orchestration-policy.js';
import {
  GlcDirectorOrchestrationSliceSchema,
  type GlcDirectorOrchestrationSlice,
} from '../../schemas/glc-director-orchestration-slice.js';

/**
 * Read-only parse of persisted director execution slice from `audit_domains.raw_data`.
 */
export function tryParseGlcDirectorOrchestrationSlice(rawData: unknown): GlcDirectorOrchestrationSlice | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;
  const rec = rawData as Record<string, unknown>;
  const chunk = rec[GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY];
  const parsed = GlcDirectorOrchestrationSliceSchema.safeParse(chunk);
  return parsed.success ? parsed.data : null;
}

/**
 * Latest row per `domain_key` should be passed in (caller dedupes by version).
 */
export function buildDirectorSliceIndexFromDomainRows(
  domainRows: Array<{ domain_key: string; raw_data?: unknown }>,
): Map<DomainKey, GlcDirectorOrchestrationSlice | null> {
  const m = new Map<DomainKey, GlcDirectorOrchestrationSlice | null>();
  for (const row of domainRows) {
    if (typeof row.domain_key !== 'string') continue;
    const dk = row.domain_key as DomainKey;
    m.set(dk, tryParseGlcDirectorOrchestrationSlice(row.raw_data));
  }
  return m;
}
