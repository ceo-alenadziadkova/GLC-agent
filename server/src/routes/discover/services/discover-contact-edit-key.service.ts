import crypto from 'node:crypto';
import { promisify } from 'node:util';

import {
  DISCOVER_CONTACT_EDIT_KEY_RANDOM_BYTES,
  DISCOVER_CONTACT_EDIT_KEY_SCRYPT_KEYLEN,
  DISCOVER_CONTACT_EDIT_KEY_SCRYPT_SALT_RANDOM_BYTES,
} from '../../../config/discover-contact-edit-key.js';

const scryptAsync = promisify(crypto.scrypt);

export function createContactEditKey(): string {
  return crypto.randomBytes(DISCOVER_CONTACT_EDIT_KEY_RANDOM_BYTES).toString('hex');
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function hashContactEditKey(raw: string): Promise<string> {
  const salt = crypto.randomBytes(DISCOVER_CONTACT_EDIT_KEY_SCRYPT_SALT_RANDOM_BYTES).toString('hex');
  const derived = (await scryptAsync(raw, salt, DISCOVER_CONTACT_EDIT_KEY_SCRYPT_KEYLEN)) as Buffer;
  return `v2:${salt}:${derived.toString('hex')}`;
}

export async function verifyContactEditKey(raw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('v2:')) {
    const [, salt, expectedHex] = stored.split(':');
    if (!salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scryptAsync(raw, salt, expected.length)) as Buffer;
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }
  // Legacy fallback for existing records created before v2 hashing.
  return sha256Hex(raw) === stored;
}
