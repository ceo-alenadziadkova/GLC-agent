/**
 * Load agent system prompts from server/prompts/*.md at runtime.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { DOMAIN_KEYS } from '@glc/intake-core';

import { logger } from '../../services/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../../prompts');

function stripVersionHeader(raw: string): string {
  return raw.replace(/^<!--.*?-->\n/, '').trimStart();
}

/** Appended to domain-phase prompts so `summary` and `strengths` stay readable in the product UI. */
const DOMAIN_READABLE_OUTPUT_APPEND = (() => {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, '_append-domain-readable-output.md'), 'utf-8');
    return stripVersionHeader(raw).trim();
  } catch {
    logger.error('agent.load_prompt_missing', {
      component: 'agent',
      prompt: '_append-domain-readable-output.md',
    });
    return '';
  }
})();

const DOMAIN_DIRECTOR_EXECUTION_APPEND = (() => {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, '_append-glc-director-execution.md'), 'utf-8');
    return stripVersionHeader(raw).trim();
  } catch {
    logger.error('agent.load_prompt_missing', {
      component: 'agent',
      prompt: '_append-glc-director-execution.md',
    });
    return '';
  }
})();

const DOMAIN_SECURITY_CORE_APPEND = (() => {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, '_append-domain-security-core.md'), 'utf-8');
    return stripVersionHeader(raw).trim();
  } catch {
    logger.error('agent.load_prompt_missing', {
      component: 'agent',
      prompt: '_append-domain-security-core.md',
    });
    return '';
  }
})();

const SUB_AGENT_SAFETY_CORE_APPEND = (() => {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, '_append-sub-agent-safety-core.md'), 'utf-8');
    return stripVersionHeader(raw).trim();
  } catch {
    logger.error('agent.load_prompt_missing', {
      component: 'agent',
      prompt: '_append-sub-agent-safety-core.md',
    });
    return '';
  }
})();

const RUNTIME_OUTPUT_CONTRACT_APPEND = (() => {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, '_append-runtime-output-contract.md'), 'utf-8');
    return stripVersionHeader(raw).trim();
  } catch {
    logger.error('agent.load_prompt_missing', {
      component: 'agent',
      prompt: '_append-runtime-output-contract.md',
    });
    return '';
  }
})();

const DOMAIN_PROMPT_SET = new Set<string>(DOMAIN_KEYS);

/**
 * Load a prompt from server/prompts/<name>.md, stripping the version comment header.
 * Falls back to empty string if the file is missing (shouldn't happen in prod).
 */
export function loadPrompt(name: string): string {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf-8');
    let body = stripVersionHeader(raw);
    if (DOMAIN_PROMPT_SET.has(name) && DOMAIN_SECURITY_CORE_APPEND) {
      body = `${body}\n\n${DOMAIN_SECURITY_CORE_APPEND}`;
    }
    if (DOMAIN_PROMPT_SET.has(name) && DOMAIN_READABLE_OUTPUT_APPEND) {
      body = `${body}\n\n${DOMAIN_READABLE_OUTPUT_APPEND}`;
    }
    if (DOMAIN_PROMPT_SET.has(name) && DOMAIN_DIRECTOR_EXECUTION_APPEND) {
      body = `${body}\n\n${DOMAIN_DIRECTOR_EXECUTION_APPEND}`;
    }
    if (name.startsWith('sub-agents/') && SUB_AGENT_SAFETY_CORE_APPEND) {
      body = `${body}\n\n${SUB_AGENT_SAFETY_CORE_APPEND}`;
    }
    if (RUNTIME_OUTPUT_CONTRACT_APPEND) {
      body = `${body}\n\n${RUNTIME_OUTPUT_CONTRACT_APPEND}`;
    }
    return body;
  } catch {
    logger.error('agent.load_prompt_missing', { component: 'agent', prompt: `${name}.md` });
    return '';
  }
}

/**
 * Extract the version string from a prompt file's header comment.
 * Returns e.g. "1.0" from "<!-- version: 1.0 date: 2026-03-31 -->".
 */
export function promptVersion(name: string): string {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf-8');
    const match = raw.match(/<!--\s*version:\s*([\d.]+)/);
    return match?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
