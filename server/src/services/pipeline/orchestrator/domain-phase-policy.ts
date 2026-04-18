import type { DomainKey } from '../../../types/audit.js';

/** Domain rows use `audit_domains`; recon/strategy are stored elsewhere — skip row failure updates. */
export function auditDomainRowShouldTrackFailure(
  domainKey: DomainKey | 'recon' | 'strategy',
): domainKey is DomainKey {
  return domainKey !== 'recon' && domainKey !== 'strategy';
}
