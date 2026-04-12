/**
 * Resolves English API copy for `PublicUrlNotAllowedError` from `api-user-messages.en.json`.
 */

import raw from './api-user-messages.en.json' with { type: 'json' };

export function resolvePublicUrlErrorMessage(code: string): string {
  const s = (raw as Record<string, string | undefined>)[code];
  if (typeof s === 'string' && s.length > 0) return s;
  return raw.PUBLIC_URL_NOT_ALLOWED_FALLBACK;
}
