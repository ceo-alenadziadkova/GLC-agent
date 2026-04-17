import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import {
  type AuditState,
  type DomainData,
  type DomainKey,
} from '../../../data/auditTypes';
import { bankIdToBriefQuestion } from '../../../data/bankQuestionUiCatalog';
import { formatAuditWebsiteDisplay } from '../../../data/no-public-website';
import { visibleDomainKeysForMeta } from './policies';

type PostAuditRef = { domain: string; id: string };

function isPostAuditRef(value: unknown): value is PostAuditRef {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PostAuditRef>;
  return typeof candidate.domain === 'string' && typeof candidate.id === 'string';
}

export function deriveCompanyName(audit: AuditState): string {
  return (
    audit.meta.company_name ||
    formatAuditWebsiteDisplay(audit.meta.company_url, audit.meta.no_public_website) ||
    audit.meta.company_url
  );
}

export function deriveOverallScore(audit: AuditState, keys: readonly DomainKey[]): number {
  const domainEntries = keys
    .map(key => audit.domains[key])
    .filter((domain): domain is DomainData => domain != null && domain.score != null);

  if (audit.meta.overall_score != null) {
    return audit.meta.overall_score;
  }
  if (domainEntries.length === 0) return 0;
  return +(domainEntries.reduce((sum, domain) => sum + (domain.score ?? 0), 0) / domainEntries.length).toFixed(1);
}

export function deriveFollowupQuestions(audit: AuditState, activeDomain: DomainKey) {
  const postAuditRaw = audit.brief?.post_audit_questions ?? [];
  const followupRefs = postAuditRaw
    .filter(isPostAuditRef)
    .filter(ref => ref.domain === activeDomain);

  return followupRefs.map(ref => {
    const stub = QUESTION_BANK_V1_STUBS.find(item => item.id === ref.id);
    return bankIdToBriefQuestion(ref.id, stub?.priority ?? 'recommended');
  });
}

export function deriveWorkspaceViewModel(audit: AuditState, activeDomain: DomainKey) {
  const visibleDomainKeys = visibleDomainKeysForMeta(audit.meta);
  const domainData = audit.domains[activeDomain] ?? null;
  const followupQuestions = deriveFollowupQuestions(audit, activeDomain);
  const overallScore = deriveOverallScore(audit, visibleDomainKeys);
  const companyName = deriveCompanyName(audit);
  return {
    visibleDomainKeys,
    domainData,
    followupQuestions,
    overallScore,
    companyName,
  };
}
