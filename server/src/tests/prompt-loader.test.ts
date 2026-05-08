import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

import { DOMAIN_KEYS } from '@glc/intake-core';

import { loadPrompt } from '../agents/base/prompt-loader.js';
import {
  CLAUDE_COALITION_ALIGNMENT_TOOL_NAME,
  CLAUDE_COALITION_CONFLICT_RESOLVER_TOOL_NAME,
  CLAUDE_COALITION_CONTEXT_DIRECTOR_TOOL_NAME,
  CLAUDE_COALITION_HYPOTHESIS_TOOL_NAME,
  CLAUDE_DOMAIN_SUBMIT_TOOL_NAME,
} from '../config/agent-claude-contract.js';
import { GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION } from '../config/director-orchestration-policy.js';
import { ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME } from '../config/orchestration-synthesis-policy.js';
import { PROMPT_INDUSTRY_HEURISTICS } from '../config/prompt-industry-heuristics.js';
import { STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME } from '../config/strategy-initiative-policy.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');
const APPEND_FILES = {
  runtime: '_append-runtime-output-contract.md',
  pipelineTrustBoundary: '_append-pipeline-trust-boundary.md',
  domainSecurity: '_append-domain-security-core.md',
  domainReadable: '_append-domain-readable-output.md',
  domainDirector: '_append-glc-director-execution.md',
  directorResearchRigor: '_append-director-research-rigor-core.md',
  subAgentSafety: '_append-sub-agent-safety-core.md',
  nonDomainSafety: '_append-non-domain-security-core.md',
  collaborationProtocol: '_append-collaboration-protocol.md',
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

  it('appends collaboration protocol to coalition prompts', () => {
    const coalitionAppend = readAppend(APPEND_FILES.collaborationProtocol);
    const promptNames = [
      'context-director',
      'cross-domain-conflict-resolver',
      ...DOMAIN_KEYS.map((d) => `${d}-hypothesis`),
      ...DOMAIN_KEYS.map((d) => `${d}-alignment`),
      ...DOMAIN_KEYS.map((d) => `${d}-finalize`),
    ];
    for (const promptName of promptNames) {
      const promptBody = loadPrompt(promptName);
      expect(promptBody).toContain(coalitionAppend);
    }
  });

  it('appends pipeline trust boundary to recon and strategy prompts', () => {
    const recon = loadPrompt('recon');
    const strategy = loadPrompt('strategy');
    const trustAppend = readAppend(APPEND_FILES.pipelineTrustBoundary);

    expect(recon).toContain(trustAppend);
    expect(strategy).toContain(trustAppend);
  });

  it('appends non-domain safety guardrails to strategy prompt', () => {
    const strategy = loadPrompt('strategy');
    const nonDomainAppend = readAppend(APPEND_FILES.nonDomainSafety);
    expect(strategy).toContain(nonDomainAppend);
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

  it('aliases legacy domain prompts to finalize prompts only when coalition finalizing is active', () => {
    const previousEnabled = process.env.FEATURE_COALITION_PROTOCOL_ENABLED;
    const previousMode = process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE;
    try {
      process.env.FEATURE_COALITION_PROTOCOL_ENABLED = 'true';
      process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE = 'internal';
      expect(loadPrompt('tech_infrastructure')).toContain('CTO Director finalizing the Tech Infrastructure domain');
    } finally {
      if (previousEnabled === undefined) delete process.env.FEATURE_COALITION_PROTOCOL_ENABLED;
      else process.env.FEATURE_COALITION_PROTOCOL_ENABLED = previousEnabled;
      if (previousMode === undefined) delete process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE;
      else process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE = previousMode;
    }
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

  it('keeps director execution append schema_version literal aligned with schema constant', () => {
    const directorAppend = readAppend(APPEND_FILES.domainDirector);
    const versionMatch = directorAppend.match(/`schema_version`:\s*must be `(\d+)`/);
    expect(versionMatch).not.toBeNull();
    expect(Number(versionMatch?.[1])).toBe(GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION);
  });
});

describe('prompt-loader tool name centralization', () => {
  function expectToolGate(promptBody: string, toolName: string): void {
    expect(promptBody).toContain(`Use the ${toolName} tool only. Output only the tool payload.`);
  }

  it('injects canonical submit_analysis tool gate into recon, strategy, and every domain prompt', () => {
    expectToolGate(loadPrompt('recon'), CLAUDE_DOMAIN_SUBMIT_TOOL_NAME);
    expectToolGate(loadPrompt('strategy'), CLAUDE_DOMAIN_SUBMIT_TOOL_NAME);
    for (const domainKey of DOMAIN_KEYS) {
      expectToolGate(loadPrompt(domainKey), CLAUDE_DOMAIN_SUBMIT_TOOL_NAME);
    }
  });

  it('injects strategy-execution-pack tool gate from canonical constant', () => {
    expectToolGate(loadPrompt('strategy-execution-pack'), STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME);
  });

  it('injects coalition tool gates from canonical constants', () => {
    expectToolGate(loadPrompt('context-director'), CLAUDE_COALITION_CONTEXT_DIRECTOR_TOOL_NAME);
    expectToolGate(loadPrompt('cross-domain-conflict-resolver'), CLAUDE_COALITION_CONFLICT_RESOLVER_TOOL_NAME);
    for (const domainKey of DOMAIN_KEYS) {
      expectToolGate(loadPrompt(`${domainKey}-hypothesis`), CLAUDE_COALITION_HYPOTHESIS_TOOL_NAME);
      expectToolGate(loadPrompt(`${domainKey}-alignment`), CLAUDE_COALITION_ALIGNMENT_TOOL_NAME);
      expectToolGate(loadPrompt(`${domainKey}-finalize`), CLAUDE_DOMAIN_SUBMIT_TOOL_NAME);
    }
  });

  it('injects orchestration-pack-synthesis tool gate from canonical constant', () => {
    expectToolGate(
      loadPrompt('orchestration-pack-synthesis'),
      ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME,
    );
  });

  it('keeps tool gate immediately before runtime output contract', () => {
    const recon = loadPrompt('recon');
    const toolGateIndex = recon.indexOf(
      `Use the ${CLAUDE_DOMAIN_SUBMIT_TOOL_NAME} tool only. Output only the tool payload.`,
    );
    const runtimeIndex = recon.indexOf(readAppend(APPEND_FILES.runtime));
    expect(toolGateIndex).toBeGreaterThan(-1);
    expect(runtimeIndex).toBeGreaterThan(toolGateIndex);
  });

  it('does not hardcode tool gate sentence in base phase prompt files on disk', () => {
    const phasePromptNames = [
      'recon',
      ...DOMAIN_KEYS,
      'strategy',
      'strategy-execution-pack',
      'orchestration-pack-synthesis',
    ];
    for (const promptName of phasePromptNames) {
      const raw = readFileSync(join(PROMPTS_DIR, `${promptName}.md`), 'utf-8');
      expect(raw).not.toMatch(/Use the .*tool only\. No prose outside the tool\./);
      expect(raw).not.toMatch(/Output: use the `[^`]+` tool only\. No prose outside the tool\./);
    }
  });
});

describe('prompt-loader industry heuristics centralization', () => {
  it('injects centralized industry heuristics into configured prompts', () => {
    for (const promptName of Object.keys(PROMPT_INDUSTRY_HEURISTICS)) {
      const promptBody = loadPrompt(promptName);
      const heuristics = PROMPT_INDUSTRY_HEURISTICS[promptName as keyof typeof PROMPT_INDUSTRY_HEURISTICS];
      expect(promptBody).toContain(`## ${heuristics.title}`);
      for (const bullet of heuristics.bullets) {
        expect(promptBody).toContain(`- ${bullet}`);
      }
    }
  });

  it('keeps base prompt files free from duplicated industry-heuristic sections', () => {
    const baseAutomation = readFileSync(join(PROMPTS_DIR, 'automation_processes.md'), 'utf-8');
    const baseMarketing = readFileSync(join(PROMPTS_DIR, 'marketing_utp.md'), 'utf-8');
    const baseUx = readFileSync(join(PROMPTS_DIR, 'ux_conversion.md'), 'utf-8');
    const baseSeo = readFileSync(join(PROMPTS_DIR, 'seo_digital.md'), 'utf-8');

    expect(baseAutomation).not.toContain('## Industry Context');
    expect(baseMarketing).not.toContain('## Location-Aware Considerations');
    expect(baseUx).not.toContain('hospitality needs booking CTAs');
    expect(baseSeo).not.toContain('business targets multiple language markets');
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
