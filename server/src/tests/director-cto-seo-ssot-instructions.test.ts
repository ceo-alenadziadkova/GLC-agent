import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readInstruction(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), '..', relativePath), 'utf8');
}

describe('CTO/SEO SSOT instruction completeness', () => {
  it('CTO instructions include required multi-agent SSOT sections', () => {
    const cto = readInstruction('docs/instructions/CTO-INSTRUCTIONS.md');
    expect(cto).toContain('Domain: `tech_infrastructure`');
    expect(cto).toContain('## 4) Multi-agent catalog (target architecture)');
    expect(cto).toContain('## 5) Dependency and execution policy');
    expect(cto).toContain('## 6) Access-aware depth routing');
    expect(cto).toContain('## 8) Required output contract');
    expect(cto).toContain('## 10) Acceptance checks for future runtime implementation');
    const ctoAgents = (cto.match(/### AGENT \d+ — /g) ?? []).length;
    expect(ctoAgents).toBeGreaterThanOrEqual(8);
  });

  it('SEO instructions include required multi-agent SSOT sections', () => {
    const seo = readInstruction('docs/instructions/SEO-INSTRUCTIONS.md');
    expect(seo).toContain('Domain: `seo_digital`');
    expect(seo).toContain('## 4) Multi-agent catalog (target architecture)');
    expect(seo).toContain('## 5) Dependency and execution policy');
    expect(seo).toContain('## 6) Access-aware depth routing');
    expect(seo).toContain('## 8) Required output contract');
    expect(seo).toContain('## 10) Acceptance checks for future runtime implementation');
    const seoAgents = (seo.match(/### AGENT \d+ — /g) ?? []).length;
    expect(seoAgents).toBeGreaterThanOrEqual(8);
  });
});
