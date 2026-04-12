/**
 * Default base URLs for outbound integrations (override via env in the caller).
 */

export const DEFAULT_TELEGRAM_API_BASE = 'https://api.telegram.org' as const;

/** Infrastructure: corporate proxy or alternate Telegram API host. */
export function getTelegramApiBase(): string {
  const raw = process.env.TELEGRAM_API_BASE?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return DEFAULT_TELEGRAM_API_BASE;
}
