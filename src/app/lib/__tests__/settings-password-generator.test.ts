import { describe, expect, it } from 'vitest';
import { SETTINGS_PASSWORD_GENERATOR_POLICY } from '../../config/settings-password-generator-policy';
import { SETTINGS_PAGE_DEFAULTS } from '../../config/settings-page-defaults';
import { generateSettingsFormPassword } from '../settings-password-generator';

const hasClass = (pwd: string, re: RegExp) => re.test(pwd);

describe('generateSettingsFormPassword', () => {
  it('meets minimum length and includes all character classes', () => {
    for (let i = 0; i < 50; i += 1) {
      const pwd = generateSettingsFormPassword();
      expect(pwd.length).toBeGreaterThanOrEqual(SETTINGS_PAGE_DEFAULTS.minPasswordChars);
      expect(pwd.length).toBeGreaterThanOrEqual(SETTINGS_PASSWORD_GENERATOR_POLICY.length);
      expect(hasClass(pwd, /[a-z]/)).toBe(true);
      expect(hasClass(pwd, /[A-Z]/)).toBe(true);
      expect(hasClass(pwd, /[0-9]/)).toBe(true);
      const symbols = SETTINGS_PASSWORD_GENERATOR_POLICY.symbols.split('');
      expect(symbols.some(c => pwd.includes(c))).toBe(true);
    }
  });
});
