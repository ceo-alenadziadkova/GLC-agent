import { describe, expect, it } from 'vitest';
import { auditDomains as indexExportedDomains } from '../index';
import { auditDomains } from './report-catalog.fallback';
import { AUDIT_DOMAIN_ORDER } from './domain-keys';
import { validateReportCatalogFallback } from './validators/report-catalog-fallback.validator';
import type { CatalogAuditDomain } from './report-catalog.types';

function cloneDomains(domains: CatalogAuditDomain[]): CatalogAuditDomain[] {
  return structuredClone(domains);
}

describe('report catalog fallback', () => {
  it('keeps expected domain order', () => {
    expect(auditDomains.map((domain) => domain.id)).toEqual(AUDIT_DOMAIN_ORDER);
  });

  it('exposes unique domain ids', () => {
    const domainIds = auditDomains.map((domain) => domain.id);
    expect(new Set(domainIds).size).toBe(domainIds.length);
  });

  it('contains required display fields', () => {
    for (const domain of auditDomains) {
      expect(domain.name.length).toBeGreaterThan(0);
      expect(domain.icon.length).toBeGreaterThan(0);
      expect(domain.executiveSummary.length).toBeGreaterThan(0);
    }
  });

  it('preserves re-export compatibility through audit index', () => {
    expect(indexExportedDomains).toBe(auditDomains);
  });

  it('rejects duplicated issue ids inside a domain', () => {
    const domains = cloneDomains(auditDomains);
    domains[0].issues[1].id = domains[0].issues[0].id;

    expect(() => validateReportCatalogFallback(domains)).toThrow(/duplicated issue ids/i);
  });

  it('rejects malformed quick wins', () => {
    const domains = cloneDomains(auditDomains);
    domains[0].quickWins[0].title = '   ';

    expect(() => validateReportCatalogFallback(domains)).toThrow(/malformed quick wins/i);
  });
});
