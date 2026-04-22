import { describe, expect, it } from 'vitest';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SERVER_SRC_DIR = join(__dirname, '..');
const SUB_AGENT_SCHEMAS_DIR = join(SERVER_SRC_DIR, 'schemas/sub-agents');
const TESTS_DIR = __dirname;

function listImmediateDirectories(rootDir: string): string[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

describe('director schema rigor coverage', () => {
  it('requires one schema-rigor test file per director family', () => {
    const families = listImmediateDirectories(SUB_AGENT_SCHEMAS_DIR);
    expect(families.length).toBeGreaterThan(0);

    const testFiles = readdirSync(TESTS_DIR, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name);

    for (const family of families) {
      const expectedTestFile = `director-${family}-schema-rigor.test.ts`;
      expect(testFiles).toContain(expectedTestFile);
    }
  });
});
