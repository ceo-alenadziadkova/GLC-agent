import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIRECTOR_SUB_AGENTS } from '../config/director-sub-agents.js';

describe('director sub-agent registry consistency', () => {
  it('has existing prompt files with source-of-truth header', () => {
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      expect(existsSync(absolute)).toBe(true);
      const content = readFileSync(absolute, 'utf8');
      expect(content).toContain('docs/instructions/CMO-INSTRUCTIONS.md');
    }
  });

  it('registry refs point to existing schema modules and frontend copy keys', () => {
    const copyPath = resolve(process.cwd(), '../src/app/config/orchestration-roadmap-ui-copy.en.ts');
    const copyContent = readFileSync(copyPath, 'utf8');
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const schemaPath = resolve(process.cwd(), `../server/src/${agent.output_schema_ref}.ts`);
      expect(existsSync(schemaPath)).toBe(true);
      const titleNeedle = `${agent.id.replaceAll('.', '_')}_title`;
      const descriptionNeedle = `${agent.id.replaceAll('.', '_')}_description`;
      expect(copyContent).toContain(titleNeedle);
      expect(copyContent).toContain(descriptionNeedle);
    }
  });
});
