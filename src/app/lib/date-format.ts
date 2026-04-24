import { DATE_FORMAT_CONFIG } from '../config/date-format-config';

/**
 * Returns a locale-aware short date (e.g. "Apr 20, 2026").
 */
export function formatAppShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(
    DATE_FORMAT_CONFIG.locale,
    DATE_FORMAT_CONFIG.shortDate,
  );
}

/**
 * Returns a locale-aware medium date + short time.
 */
export function formatAppMediumDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(
    DATE_FORMAT_CONFIG.locale,
    DATE_FORMAT_CONFIG.mediumDateTime,
  );
}
