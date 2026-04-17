import { INTAKE_TOKEN_HEX_REGEX } from '../../../config/intake-token.js';

export function parseTrimmedIntakeTokenFromString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || !INTAKE_TOKEN_HEX_REGEX.test(t)) return null;
  return t;
}

export function parseNonEmptyTrimmedString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}
