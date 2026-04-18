/**
 * Node-only lint: scans intake/core sources on disk. Not bundled for the browser.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LintFinding } from './lint-bank-policy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = __dirname;

const FORBIDDEN_PATTERNS: { code: string; pattern: RegExp; hint: string }[] = [
  { code: 'FORBIDDEN_IMPORT_FS', pattern: /\bfrom\s+['"]node:fs['"]|\bfrom\s+['"]fs['"]/, hint: 'Do not use fs in intake/core (keep isomorphic).' },
  { code: 'FORBIDDEN_IMPORT_PATH', pattern: /\bfrom\s+['"]node:path['"]|\bfrom\s+['"]path['"]/, hint: 'Do not use path in intake/core.' },
  { code: 'FORBIDDEN_CHILD_PROCESS', pattern: /child_process/, hint: 'No child_process in intake/core.' },
];

const ALLOWLIST_CORE_FILES = new Set(['lint-bank-policy-node.ts']);

/** Scan intake/core sources for Node-only patterns (excluding allowlisted files). */
export function lintForbiddenImportsInCore(coreDir: string = CORE_DIR): LintFinding[] {
  const findings: LintFinding[] = [];
  const names = readdirSync(coreDir).filter((f: string) => f.endsWith('.ts'));
  for (const name of names) {
    if (ALLOWLIST_CORE_FILES.has(name)) continue;
    const abs = join(coreDir, name);
    const content = readFileSync(abs, 'utf8');
    for (const { code, pattern, hint } of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({
          code,
          severity: 'error',
          message: `${name}: ${hint}`,
          detail: name,
        });
      }
    }
    if (/\bprocess\.env\b/.test(content)) {
      findings.push({
        code: 'FORBIDDEN_PROCESS_ENV',
        severity: 'error',
        message: `${name}: Do not use process.env in intake/core (keep isomorphic).`,
        detail: name,
      });
    }
  }
  return findings;
}
