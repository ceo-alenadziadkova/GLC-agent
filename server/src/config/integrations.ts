/**
 * Default base URLs for outbound integrations (override via env in the caller).
 */

export const DEFAULT_TELEGRAM_API_BASE = 'https://api.telegram.org' as const;

/** Infrastructure: corporate proxy or alternate Telegram API host. */
export function getTelegramApiBase(): string {
  const raw = process.env.TELEGRAM_API_BASE?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TELEGRAM_API_BASE is required when NODE_ENV=production');
  }
  return DEFAULT_TELEGRAM_API_BASE;
}
