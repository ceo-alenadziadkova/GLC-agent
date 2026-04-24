import { SETTINGS_PAGE_DEFAULTS } from './settings-page-defaults';

/**
 * Client-only strong password generation for Settings (Change password).
 * Length is capped at the platform minimum or higher.
 */
export const SETTINGS_PASSWORD_GENERATOR_POLICY = {
  /** Preferred length when it is at least the platform minimum. */
  length: 18,
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*-_=+',
} as const;

export function settingsPasswordGeneratorTargetLength(): number {
  return Math.max(SETTINGS_PASSWORD_GENERATOR_POLICY.length, SETTINGS_PAGE_DEFAULTS.minPasswordChars);
}
