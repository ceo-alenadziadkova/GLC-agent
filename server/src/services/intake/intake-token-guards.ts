import { INTAKE_TOKEN_HEX_REGEX } from '../../config/intake-token.js';

function firstParamSegment(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export function normalizePrefillIntakeTokenParam(raw: string | string[] | undefined): string {
  return String(firstParamSegment(raw) ?? '').trim();
}

/** Public `/:token` routes use the raw param (no trim) to match legacy behavior. */
export function normalizePublicIntakeRouteTokenParam(raw: string | string[] | undefined): string {
  return String(firstParamSegment(raw) ?? '');
}

export function isIntakeTokenFormatValid(token: string): boolean {
  return token.length > 0 && INTAKE_TOKEN_HEX_REGEX.test(token);
}

export function intakeLinkExpired(expiresAtIso: string, nowMs: number = Date.now()): boolean {
  const exp = new Date(expiresAtIso).getTime();
  return !Number.isFinite(exp) || nowMs > exp;
}
