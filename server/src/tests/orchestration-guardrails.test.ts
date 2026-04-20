import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SERVER_SRC_ROOT = join(process.cwd(), 'src');

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }
    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toWorkspaceRelative(path: string): string {
  return path.replace(`${SERVER_SRC_ROOT}/`, '');
}

describe('orchestration guardrails', () => {
  it('uses FEATURE_* env flags only in feature-flag facade and tests', () => {
    const offenders: string[] = [];
    for (const file of collectTsFiles(SERVER_SRC_ROOT)) {
      const relative = toWorkspaceRelative(file);
      if (
        relative.startsWith('config/feature-flags.ts') ||
        relative.startsWith('tests/') ||
        relative.startsWith('config/system-defaults/')
      ) {
        continue;
      }
      const content = readFileSync(file, 'utf8');
      if (content.includes('process.env.FEATURE_')) {
        offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});
