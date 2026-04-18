import type { CatalogAuditDomain } from '../../report-catalog.types';

export type CatalogDomainCopy = Omit<CatalogAuditDomain, 'icon'>;
