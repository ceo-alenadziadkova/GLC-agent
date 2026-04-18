import { AUDIT_DOMAIN_ORDER, type AuditDomainId } from '../../domain-keys';
import type { CatalogAuditDomain } from '../../report-catalog.types';
import { DOMAIN_ICON_BY_ID } from '../catalog-display.config';
import type { CatalogDomainCopy } from './domain-copy.types';
import { automationDomainCopy } from './automation.copy';
import { marketingDomainCopy } from './marketing.copy';
import { reconDomainCopy } from './recon.copy';
import { securityDomainCopy } from './security.copy';
import { seoDomainCopy } from './seo.copy';
import { strategyDomainCopy } from './strategy.copy';
import { techInfrastructureDomainCopy } from './tech-infrastructure.copy';
import { uxDomainCopy } from './ux.copy';

export const DOMAIN_COPY_BY_ID: Record<AuditDomainId, CatalogDomainCopy> = {
  recon: reconDomainCopy,
  'tech-infrastructure': techInfrastructureDomainCopy,
  security: securityDomainCopy,
  seo: seoDomainCopy,
  ux: uxDomainCopy,
  marketing: marketingDomainCopy,
  automation: automationDomainCopy,
  strategy: strategyDomainCopy,
};

export const REPORT_CATALOG_COPY: CatalogAuditDomain[] = AUDIT_DOMAIN_ORDER.map((domainId) => ({
  ...DOMAIN_COPY_BY_ID[domainId],
  icon: DOMAIN_ICON_BY_ID[domainId],
}));
