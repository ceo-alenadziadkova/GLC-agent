import type { CatalogAuditDomain } from '../report-catalog.types';
import type { AuditDomainId } from '../domain-keys';

export const DOMAIN_ICON_BY_ID: Record<AuditDomainId, CatalogAuditDomain['icon']> = {
  recon: 'Search',
  'tech-infrastructure': 'Server',
  security: 'Shield',
  seo: 'Globe',
  ux: 'MousePointer',
  marketing: 'Target',
  automation: 'Zap',
  strategy: 'Map',
};
