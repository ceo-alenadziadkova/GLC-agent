import { NUMBER_FORMAT_CONFIG } from '../config/number-format-config';

/**
 * Returns a locale-aware grouped integer string.
 */
export function formatAppInteger(value: number): string {
  return value.toLocaleString(NUMBER_FORMAT_CONFIG.locale);
}
