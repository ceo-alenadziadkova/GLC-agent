import { DOMAIN_COPY_BY_ID } from '../config/domain-copy';
import { DOMAIN_ICON_BY_ID } from '../config/catalog-display.config';
import type { AuditDomainId } from '../domain-keys';
import type { CatalogAuditDomain } from '../report-catalog.types';

export function createFallbackDomain(domainId: AuditDomainId): CatalogAuditDomain {
  const source = DOMAIN_COPY_BY_ID[domainId];
  if (!source) {
    throw new Error(`Missing fallback report domain copy for "${domainId}"`);
  }

  return {
    ...source,
    icon: DOMAIN_ICON_BY_ID[domainId],
  };
}
