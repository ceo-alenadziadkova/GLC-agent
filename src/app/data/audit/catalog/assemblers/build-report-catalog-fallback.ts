import type { CatalogAuditDomain } from '../report-catalog.types';
import { reconFallbackDomain } from '../domains/recon.fallback';
import { techInfrastructureFallbackDomain } from '../domains/tech-infrastructure.fallback';
import { securityFallbackDomain } from '../domains/security.fallback';
import { seoFallbackDomain } from '../domains/seo.fallback';
import { uxFallbackDomain } from '../domains/ux.fallback';
import { marketingFallbackDomain } from '../domains/marketing.fallback';
import { automationFallbackDomain } from '../domains/automation.fallback';
import { strategyFallbackDomain } from '../domains/strategy.fallback';
import { validateReportCatalogFallback } from '../validators/report-catalog-fallback.validator';

export function buildReportCatalogFallback(): CatalogAuditDomain[] {
  const domains: CatalogAuditDomain[] = [
    reconFallbackDomain,
    techInfrastructureFallbackDomain,
    securityFallbackDomain,
    seoFallbackDomain,
    uxFallbackDomain,
    marketingFallbackDomain,
    automationFallbackDomain,
    strategyFallbackDomain,
  ];

  validateReportCatalogFallback(domains);

  return domains;
}
