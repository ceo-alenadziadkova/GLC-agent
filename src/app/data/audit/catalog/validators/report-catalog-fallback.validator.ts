import type { CatalogAuditDomain } from '../report-catalog.types';
import { AUDIT_DOMAIN_ORDER } from '../domain-keys';

function hasUniqueDomainIds(domains: CatalogAuditDomain[]): boolean {
  return new Set(domains.map((domain) => domain.id)).size === domains.length;
}

function hasNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

function hasUniqueIds<T extends { id: string }>(items: T[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function validateIssueShape(domainId: string, domain: CatalogAuditDomain): void {
  if (!hasUniqueIds(domain.issues)) {
    throw new Error(`Fallback domain "${domainId}" has duplicated issue ids`);
  }

  for (const issue of domain.issues) {
    if (!hasNonEmptyText(issue.id) || !hasNonEmptyText(issue.title) || !hasNonEmptyText(issue.description) || !hasNonEmptyText(issue.impact)) {
      throw new Error(`Fallback domain "${domainId}" has malformed issues`);
    }
  }
}

function validateRecommendationShape(domainId: string, domain: CatalogAuditDomain): void {
  if (!hasUniqueIds(domain.recommendations)) {
    throw new Error(`Fallback domain "${domainId}" has duplicated recommendation ids`);
  }

  for (const recommendation of domain.recommendations) {
    if (
      !hasNonEmptyText(recommendation.id) ||
      !hasNonEmptyText(recommendation.title) ||
      !hasNonEmptyText(recommendation.description) ||
      !hasNonEmptyText(recommendation.estimatedCost) ||
      !hasNonEmptyText(recommendation.estimatedTime) ||
      !hasNonEmptyText(recommendation.impact)
    ) {
      throw new Error(`Fallback domain "${domainId}" has malformed recommendations`);
    }
  }
}

function validateQuickWinShape(domainId: string, domain: CatalogAuditDomain): void {
  if (!hasUniqueIds(domain.quickWins)) {
    throw new Error(`Fallback domain "${domainId}" has duplicated quick win ids`);
  }

  for (const quickWin of domain.quickWins) {
    if (!hasNonEmptyText(quickWin.id) || !hasNonEmptyText(quickWin.title) || !hasNonEmptyText(quickWin.description) || !hasNonEmptyText(quickWin.timeframe)) {
      throw new Error(`Fallback domain "${domainId}" has malformed quick wins`);
    }
  }
}

export function validateReportCatalogFallback(domains: CatalogAuditDomain[]): void {
  if (domains.length !== AUDIT_DOMAIN_ORDER.length) {
    throw new Error(`Expected ${AUDIT_DOMAIN_ORDER.length} fallback domains, got ${domains.length}`);
  }

  if (!hasUniqueDomainIds(domains)) {
    throw new Error('Fallback domain ids must be unique');
  }

  for (const domainId of AUDIT_DOMAIN_ORDER) {
    const domain = domains.find((item) => item.id === domainId);
    if (!domain) {
      throw new Error(`Missing fallback domain "${domainId}"`);
    }

    if (!hasNonEmptyText(domain.name) || !hasNonEmptyText(domain.icon) || !hasNonEmptyText(domain.executiveSummary)) {
      throw new Error(`Fallback domain "${domainId}" has required text fields missing`);
    }

    validateIssueShape(domainId, domain);
    validateRecommendationShape(domainId, domain);
    validateQuickWinShape(domainId, domain);
  }
}
