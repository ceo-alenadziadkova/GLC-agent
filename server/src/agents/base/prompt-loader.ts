/**
 * Load agent system prompts from server/prompts/*.md at runtime.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { logger } from '../../services/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../../prompts');

/**
 * Load a prompt from server/prompts/<name>.md, stripping the version comment header.
 * Falls back to empty string if the file is missing (shouldn't happen in prod).
 */
export function loadPrompt(name: string): string {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf-8');
    return raw.replace(/^<!--.*?-->\n/, '').trimStart();
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
