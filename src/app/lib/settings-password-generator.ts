import {
  SETTINGS_PASSWORD_GENERATOR_POLICY,
  settingsPasswordGeneratorTargetLength,
} from '../config/settings-password-generator-policy';

function randomUintBelow(exclusiveMax: number): number {
  const max = 0x1_0000_0000 - (0x1_0000_0000 % exclusiveMax);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= max);
  return x % exclusiveMax;
}

function pickCharFrom(alphabet: string): string {
  const i = randomUintBelow(alphabet.length);
  return alphabet[i]!;
}

function shuffleInPlace(chars: string[]): void {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomUintBelow(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
}

/**
 * Generates a random password with at least one character from each character class.
 * Uses `crypto.getRandomValues` (browser Web Crypto).
 */
export function generateSettingsFormPassword(): string {
  const p = SETTINGS_PASSWORD_GENERATOR_POLICY;
  const targetLen = settingsPasswordGeneratorTargetLength();
  const all = `${p.lowercase}${p.uppercase}${p.digits}${p.symbols}`;

  const required: string[] = [
    pickCharFrom(p.lowercase),
    pickCharFrom(p.uppercase),
    pickCharFrom(p.digits),
    pickCharFrom(p.symbols),
  ];

  const out: string[] = [...required];
  while (out.length < targetLen) {
    out.push(pickCharFrom(all));
  }
  shuffleInPlace(out);
  return out.join('');
}
