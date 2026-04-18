import { z } from 'zod';

import { isDiscoverMaturityLevel } from '../../../config/discover-contract.js';

export function normalizeDiscoverRouteTokenParam(v: string | string[] | undefined): string {
  if (v === undefined) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

const postDiscoverSessionBodySchema = z
  .object({
    answers: z.unknown(),
    maturity_level: z.unknown(),
    findings: z.unknown(),
  })
  .superRefine((val, ctx) => {
    if (!val.answers || typeof val.answers !== 'object' || Array.isArray(val.answers)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['answers'] });
      return;
    }
    const ml = Number(val.maturity_level);
    if (!isDiscoverMaturityLevel(ml)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maturity_level'] });
      return;
    }
    if (!Array.isArray(val.findings)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['findings'] });
    }
  })
  .transform((val): { answers: Record<string, unknown>; maturity_level: number; findings: unknown[] } => ({
    answers: val.answers as Record<string, unknown>,
    maturity_level: Number(val.maturity_level),
    findings: val.findings as unknown[],
  }));

export function safeParsePostDiscoverSessionBody(body: unknown) {
  return postDiscoverSessionBodySchema.safeParse(body);
}

/**
 * Lenient parse: only `string` fields are picked (same as legacy `typeof === 'string'` checks).
 * Non-string values are ignored so a valid `contact_edit_key` is not lost when another field is malformed.
 */
const patchDiscoverContactBodySchema = z
  .object({
    contact_edit_key: z.unknown().optional(),
    contact_name: z.unknown().optional(),
    contact_email: z.unknown().optional(),
    contact_phone: z.unknown().optional(),
    contact_company: z.unknown().optional(),
  })
  .transform((raw) => ({
    contact_edit_key: typeof raw.contact_edit_key === 'string' ? raw.contact_edit_key : undefined,
    contact_name: typeof raw.contact_name === 'string' ? raw.contact_name : undefined,
    contact_email: typeof raw.contact_email === 'string' ? raw.contact_email : undefined,
    contact_phone: typeof raw.contact_phone === 'string' ? raw.contact_phone : undefined,
    contact_company: typeof raw.contact_company === 'string' ? raw.contact_company : undefined,
  }));

export function safeParsePatchDiscoverContactBody(body: unknown) {
  return patchDiscoverContactBodySchema.safeParse(body ?? {});
}
