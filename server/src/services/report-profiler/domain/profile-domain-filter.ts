import { REPORT_PROFILE_DOMAINS, type ReportProfile } from '@glc/intake-core';
import type { DomainRow } from '../types.js';

export function filterDomainsByProfile(domains: DomainRow[], profile: ReportProfile): DomainRow[] {
  const allowedDomains = REPORT_PROFILE_DOMAINS[profile];
  if (allowedDomains === 'all') {
    return domains;
  }

  return domains.filter((domain) => (allowedDomains as string[]).includes(domain.domain_key));
}
