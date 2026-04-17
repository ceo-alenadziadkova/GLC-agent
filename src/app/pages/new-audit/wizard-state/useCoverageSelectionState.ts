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
}) {
  const [coveragePackage, setCoveragePackage] = useState<AuditCoveragePackage>('complete');
  const [selectedDomains, setSelectedDomains] = useState<DomainKey[]>([...NEW_AUDIT_ALL_COVERAGE_DOMAINS]);

  const recommendedDomains = useMemo<DomainKey[]>(() => {
    if (!params.industry) return NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
    return NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS[params.industry] ?? NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
  }, [params.industry]);

  useEffect(() => {
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
