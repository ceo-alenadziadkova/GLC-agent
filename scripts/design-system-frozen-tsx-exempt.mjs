/**
 * TSX paths excluded from automated DS checks (product-frozen marketing, etc.).
 * @param {string} root Repository root (absolute).
 * @returns {Set<string>} repo-relative posix paths
 */
import fs from 'node:fs';
import path from 'node:path';

const EXEMPT_FILE = 'design-system-frozen-tsx-exempt.txt';

export function loadFrozenTsxExemptPaths(root) {
  const abs = path.join(root, 'scripts', EXEMPT_FILE);
  if (!fs.existsSync(abs)) return new Set();
  const out = new Set();
  for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    out.add(t.replace(/\\/g, '/'));
  }
  return out;
}
