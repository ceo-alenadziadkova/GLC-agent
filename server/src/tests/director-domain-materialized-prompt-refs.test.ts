import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_DOMAIN_MATERIALIZED_PROMPT_REFS } from '../config/director-domain-materialized-prompt-refs.js';

/**
 * Same resolution strategy as `director-sub-agents-consistency.test.ts` (server cwd vs repo root).
 */
function resolvePromptPath(promptRef: string): string {
  const fromServerCwd = resolve(process.cwd(), promptRef);
  const fromRepoRoot = resolve(process.cwd(), '..', promptRef);
  if (existsSync(fromServerCwd)) return fromServerCwd;
  if (existsSync(fromRepoRoot)) return fromRepoRoot;
  return fromServerCwd;
}

describe('director domain materialized prompt refs', () => {
  it('resolves every SSOT path to an on-disk file', () => {
    for (const ref of ALL_DOMAIN_MATERIALIZED_PROMPT_REFS) {
      const p = resolvePromptPath(ref);
      expect(existsSync(p), `Missing prompt file for ${ref} (tried ${p})`).toBe(true);
    }
  });
});
