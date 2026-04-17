import { useMemo } from 'react';
import type { AuditState, DomainKey } from '../../../data/auditTypes';
import { deriveWorkspaceViewModel } from '../domain/view-model';

export function useAuditWorkspaceViewModel(
  audit: AuditState | null,
  activeDomain: DomainKey,
) {
  return useMemo(() => {
    if (!audit) {
      return {
        visibleDomainKeys: [] as readonly DomainKey[],
        domainData: null,
        followupQuestions: [],
        overallScore: 0,
        companyName: '',
      };
    }
    return deriveWorkspaceViewModel(audit, activeDomain);
  }, [audit, activeDomain]);
}
