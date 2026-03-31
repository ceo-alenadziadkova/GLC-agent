import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseAgent } from './base.js';
import { AccessibilityCollector } from '../collectors/accessibility.js';
import { UxCollector } from '../collectors/ux.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

let cachedUxInstructions: string | null = null;
const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveUxPromptPath(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const direct = join(dir, 'prompts', 'ux-agent.md');
    if (existsSync(direct)) return direct;
    const viaServer = join(dir, 'server', 'prompts', 'ux-agent.md');
    if (existsSync(viaServer)) return viaServer;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Cannot resolve prompt file: prompts/ux-agent.md');
}

function loadUxInstructionsFromFile(): string {
  if (cachedUxInstructions !== null) return cachedUxInstructions;
  const path = resolveUxPromptPath();
  cachedUxInstructions = readFileSync(path, 'utf8').trim();
  return cachedUxInstructions;
}

export class UxAgent extends BaseAgent {
  get phaseNumber() { return 4; }
  get domainKey() { return 'ux_conversion' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new AccessibilityCollector(), new UxCollector()];
  }

  get instructions() {
    return loadUxInstructionsFromFile();
  }
}
