import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

import { loadPrompt } from '../agents/base/prompt-loader.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');
const APPEND_FILES = {
  runtime: '_append-runtime-output-contract.md',
  domainSecurity: '_append-domain-security-core.md',
  domainReadable: '_append-domain-readable-output.md',
  domainDirector: '_append-glc-director-execution.md',
  directorResearchRigor: '_append-director-research-rigor-core.md',
  subAgentSafety: '_append-sub-agent-safety-core.md',
  nonDomainSafety: '_append-non-domain-security-core.md',
} as const;

function stripVersionHeader(raw: string): string {
  return raw.replace(/^<!--.*?-->\n/, '').trimStart();
}

function readAppend(fileName: string): string {
  return stripVersionHeader(readFileSync(join(PROMPTS_DIR, fileName), 'utf-8')).trim();
}

function listPromptMarkdownFiles(rootDir: string): string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listPromptMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toPromptNameFromPath(filePath: string): string {
  return relative(PROMPTS_DIR, filePath).replaceAll(sep, '/').replace(/\.md$/, '');
}

describe('prompt-loader', () => {
  it('appends runtime output contract to all runtime prompts', () => {
    const promptFiles = listPromptMarkdownFiles(PROMPTS_DIR)
      .map(filePath => toPromptNameFromPath(filePath))
      .filter(name => !name.startsWith('_append-') && name !== 'README');
    const runtimeAppend = readAppend(APPEND_FILES.runtime);

    for (const promptName of promptFiles) {
      const promptBody = loadPrompt(promptName);
      expect(promptBody).toContain(runtimeAppend);
    }
  });

  it('appends shared guardrails to domain phase prompts', () => {
    const tech = loadPrompt('tech_infrastructure');
    expect(tech).toContain(readAppend(APPEND_FILES.domainSecurity));
    expect(tech).toContain(readAppend(APPEND_FILES.domainReadable));
    expect(tech).toContain(readAppend(APPEND_FILES.domainDirector));
  });

  it('keeps append order stable for domain prompts', () => {
    const tech = loadPrompt('tech_infrastructure');
    const securityIndex = tech.indexOf(readAppend(APPEND_FILES.domainSecurity));
    const readableIndex = tech.indexOf(readAppend(APPEND_FILES.domainReadable));
    const directorIndex = tech.indexOf(readAppend(APPEND_FILES.domainDirector));
    const runtimeIndex = tech.indexOf(readAppend(APPEND_FILES.runtime));

    expect(securityIndex).toBeGreaterThan(-1);
    expect(readableIndex).toBeGreaterThan(securityIndex);
    expect(directorIndex).toBeGreaterThan(readableIndex);
    expect(runtimeIndex).toBeGreaterThan(directorIndex);
  });

  it('does not append domain-only or sub-agent-only blocks to recon', () => {
    const recon = loadPrompt('recon');
    expect(recon).not.toContain(readAppend(APPEND_FILES.domainSecurity));
    expect(recon).not.toContain(readAppend(APPEND_FILES.domainReadable));
    expect(recon).not.toContain(readAppend(APPEND_FILES.domainDirector));
    expect(recon).not.toContain(readAppend(APPEND_FILES.subAgentSafety));
  });

  it('appends sub-agent safety guardrails to sub-agent prompts', () => {
    const subAgentPrompt = loadPrompt('sub-agents/cmo/agent-5-content-strategy');
    expect(subAgentPrompt).toContain(readAppend(APPEND_FILES.directorResearchRigor));
    expect(subAgentPrompt).toContain(readAppend(APPEND_FILES.subAgentSafety));
  });

  it('appends director rigor and safety guardrails to every sub-agent prompt', () => {
    const subAgentFiles = listPromptMarkdownFiles(join(PROMPTS_DIR, 'sub-agents'));
    const rigorAppend = readAppend(APPEND_FILES.directorResearchRigor);
    const safetyAppend = readAppend(APPEND_FILES.subAgentSafety);

    expect(subAgentFiles.length).toBeGreaterThan(0);

    for (const filePath of subAgentFiles) {
      const promptName = toPromptNameFromPath(filePath);
      const promptBody = loadPrompt(promptName);
      expect(promptBody).toContain(rigorAppend);
      expect(promptBody).toContain(safetyAppend);
    }
  });

  it('keeps append order stable for every sub-agent prompt', () => {
    const subAgentFiles = listPromptMarkdownFiles(join(PROMPTS_DIR, 'sub-agents'));
    const rigorAppend = readAppend(APPEND_FILES.directorResearchRigor);
    const safetyAppend = readAppend(APPEND_FILES.subAgentSafety);
    const runtimeAppend = readAppend(APPEND_FILES.runtime);

    expect(subAgentFiles.length).toBeGreaterThan(0);

    for (const filePath of subAgentFiles) {
      const promptName = toPromptNameFromPath(filePath);
      const promptBody = loadPrompt(promptName);
      const rigorIndex = promptBody.indexOf(rigorAppend);
      const safetyIndex = promptBody.indexOf(safetyAppend);
      const runtimeIndex = promptBody.indexOf(runtimeAppend);

      expect(rigorIndex).toBeGreaterThan(-1);
      expect(safetyIndex).toBeGreaterThan(rigorIndex);
      expect(runtimeIndex).toBeGreaterThan(safetyIndex);
    }
  });

  it('appends non-domain safety guardrails to orchestration and execution prompts', () => {
    const executionPack = loadPrompt('strategy-execution-pack');
    const orchestrationSynthesis = loadPrompt('orchestration-pack-synthesis');
    const nonDomainAppend = readAppend(APPEND_FILES.nonDomainSafety);

    for (const promptBody of [executionPack, orchestrationSynthesis]) {
      expect(promptBody).toContain(nonDomainAppend);
    }
  });

  it('keeps non-domain verified-gate strict and non-inferential', () => {
    const nonDomainAppend = readAppend(APPEND_FILES.nonDomainSafety);
    expect(nonDomainAppend).toContain('exactly boolean `true`');
    expect(nonDomainAppend).toContain('Never infer verification from free-text');
  });

  it('keeps director strict-vs-best-effort guidance explicit by phase', () => {
    const tech = loadPrompt('tech_infrastructure');
    const seo = loadPrompt('seo_digital');

    expect(tech).toContain('For **strict phases** (Tech, Security, UX, Marketing, Automation), do **not omit** this key');
    expect(seo).toContain('For **best-effort SEO**, omission is allowed by policy');
  });

  it('keeps recon and strategy safety-redaction baseline explicit', () => {
    const recon = loadPrompt('recon');
    const strategy = loadPrompt('strategy');

    for (const promptBody of [recon, strategy]) {
      expect(promptBody).toContain('explicit boolean verification flag');
      expect(promptBody).toMatch(/free[- ]text/i);
      expect(promptBody).toContain('record the conflict in `unknown_items`');
    }
  });

  it('requires version header in every prompt markdown file', () => {
    const files = listPromptMarkdownFiles(PROMPTS_DIR);
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const raw = readFileSync(filePath, 'utf-8');
      expect(raw).toMatch(/<!-- version: \d+\.\d+ date: \d{4}-\d{2}-\d{2} -->/);
    }
  });
});

describe('prompt-loader negative paths', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns empty string for missing prompt file', () => {
    expect(loadPrompt('does-not-exist')).toBe('');
  });

  it('returns unknown version for missing prompt file', async () => {
    const mod = await import('../agents/base/prompt-loader.js');
    expect(mod.promptVersion('does-not-exist')).toBe('unknown');
  });

  it('gracefully loads prompt when one append file is missing', async () => {
    vi.resetModules();
    vi.doMock('fs', async importOriginal => {
      const actual = (await importOriginal()) as typeof import('fs');
      return {
        ...actual,
        readFileSync: (path: Parameters<typeof actual.readFileSync>[0], options?: Parameters<typeof actual.readFileSync>[1]) => {
          const pathValue = String(path);
          if (pathValue.endsWith('_append-runtime-output-contract.md')) {
            throw new Error('simulated missing append');
          }
          return actual.readFileSync(path, options as never);
        },
      };
    });
    const mod = await import('../agents/base/prompt-loader.js');
    const prompt = mod.loadPrompt('recon');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).not.toContain('Runtime output contract');
  });
});
