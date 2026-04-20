import type { DomainKey } from '@glc/intake-core';

import { GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY } from '../../config/director-orchestration-policy.js';
import {
  GlcDirectorOrchestrationSliceSchema,
  type GlcDirectorOrchestrationSlice,
} from '../../schemas/glc-director-orchestration-slice.js';

export const DIRECTOR_INPUT_PARSE_STATUSES = ['valid', 'missing', 'invalid'] as const;
export type DirectorInputParseStatus = (typeof DIRECTOR_INPUT_PARSE_STATUSES)[number];

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

export function parseGlcDirectorOrchestrationSliceWithStatus(rawData: unknown): {
  slice: GlcDirectorOrchestrationSlice | null;
  status: DirectorInputParseStatus;
} {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return { slice: null, status: 'missing' };
  }
  const rec = rawData as Record<string, unknown>;
  const chunk = rec[GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY];
  if (chunk === undefined || chunk === null) {
    return { slice: null, status: 'missing' };
  }
  const parsed = GlcDirectorOrchestrationSliceSchema.safeParse(chunk);
  return parsed.success
    ? { slice: parsed.data, status: 'valid' }
    : { slice: null, status: 'invalid' };
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

export function buildDirectorSliceParseStatusIndexFromDomainRows(
  domainRows: Array<{ domain_key: string; raw_data?: unknown }>,
): Map<DomainKey, DirectorInputParseStatus> {
  const m = new Map<DomainKey, DirectorInputParseStatus>();
  for (const row of domainRows) {
    if (typeof row.domain_key !== 'string') continue;
    const dk = row.domain_key as DomainKey;
    const parsed = parseGlcDirectorOrchestrationSliceWithStatus(row.raw_data);
    m.set(dk, parsed.status);
  }
  return m;
}
