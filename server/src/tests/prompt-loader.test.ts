import { describe, expect, it } from 'vitest';

import { loadPrompt } from '../agents/base/prompt-loader.js';

describe('prompt-loader', () => {
  it('appends readable-output rules to domain phase prompts', () => {
    const tech = loadPrompt('tech_infrastructure');
    expect(tech).toContain('Readable output (summary & strengths)');
    expect(tech).toContain('`summary` (string)');
    expect(tech).toContain('`strengths` (array of strings)');
  });

  it('does not append readable-output rules to recon', () => {
    const recon = loadPrompt('recon');
    expect(recon).not.toContain('Readable output (summary & strengths)');
  });
});
