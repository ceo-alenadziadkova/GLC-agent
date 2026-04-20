import { useEffect, useMemo, useState } from 'react';
import type { AuditCoveragePackage, DomainKey } from '../../../data/auditTypes';
import {
  NEW_AUDIT_ALL_COVERAGE_DOMAINS,
  NEW_AUDIT_COVERAGE_SELECTION_LIMITS,
  NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS,
  NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS,
  NEW_AUDIT_PRO_FALLBACK_SELECTION,
  NEW_AUDIT_STARTER_FALLBACK_DOMAIN,
} from '../../../config/new-audit-coverage-policy';

export function useCoverageSelectionState(params: {
  industry: string;
  isClientSelfServe: boolean;
  seedCoveragePackage?: AuditCoveragePackage;
  seedSelectedDomains?: DomainKey[];
}) {
  const [coveragePackage, setCoveragePackage] = useState<AuditCoveragePackage | null>(() => {
    if (!params.isClientSelfServe) return 'complete';
    const seeded = params.seedCoveragePackage;
    if (seeded === 'starter' || seeded === 'pro' || seeded === 'complete') return seeded;
    return null;
  });
  const [selectedDomains, setSelectedDomains] = useState<DomainKey[]>(() => {
    if (!params.isClientSelfServe) return [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
    if (params.seedSelectedDomains && params.seedSelectedDomains.length > 0) {
      return [...params.seedSelectedDomains];
    }
    return [];
  });

  const recommendedDomains = useMemo<DomainKey[]>(() => {
    if (!params.industry) return NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
    return NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS[params.industry] ?? NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
  }, [params.industry]);

  useEffect(() => {
    if (coveragePackage == null) {
      setSelectedDomains(prev => (prev.length === 0 ? prev : []));
      return;
    }
    setSelectedDomains(prev => {
      if (coveragePackage === 'complete') return [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
      if (coveragePackage === 'starter') {
        const first: DomainKey = prev[0] ?? NEW_AUDIT_STARTER_FALLBACK_DOMAIN;
        return [first];
      }
      const base: DomainKey[] = prev.length > 0 ? prev.slice(0, 3) : NEW_AUDIT_PRO_FALLBACK_SELECTION;
      return base;
    });
  }, [coveragePackage]);

  function toggleDomainSelection(domain: DomainKey) {
    setSelectedDomains(prev => {
      if (coveragePackage == null) return prev;
      const has = prev.includes(domain);
      if (coveragePackage === 'complete') return [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
      const next = has ? prev.filter(d => d !== domain) : [...prev, domain];
      if (coveragePackage === 'starter') return next.slice(0, 1);
      if (next.length > NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max) {
        return next.slice(0, NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max);
      }
      return next;
    });
  }

  return {
    coveragePackage,
    setCoveragePackage,
    selectedDomains,
    setSelectedDomains,
    recommendedDomains,
    toggleDomainSelection,
  };
}
