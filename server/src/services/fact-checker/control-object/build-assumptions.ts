import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainResult } from '../../../types/audit.js';
import type { ExtendedPhaseProfile } from '../../../config/phase-profiles.js';

export function buildAssumptions(params: {
  co: ControlObjectV1;
  result: DomainResult;
  profile: ExtendedPhaseProfile;
}): void {
  const { co, result, profile } = params;

  const issues = result.issues ?? [];

  // ─── Assumptions (v1.5: with risk + related_claim_ids) ───────────────────
  // Map low-confidence inferred findings → explicit assumptions
  // Build a claim_id lookup keyed by issue title for related_claim_ids
  const issueTitleToClaimId = new Map<string, number>(issues.map((iss, idx) => [iss.title, idx + 1]));

  let assumptionIdx = 1;
  for (let issueIdx = 0; issueIdx < issues.length; issueIdx++) {
    const issue = issues[issueIdx];
    if (issue.confidence === 'low' && issue.data_source === 'inferred') {
      // Determine risk based on phase profile default + severity boost
      const baseRisk = profile.default_assumption_risk ?? 'low';
      const risk: 'low' | 'medium' | 'high' =
        issue.severity === 'critical' ? 'high' : issue.severity === 'high' ? (baseRisk === 'low' ? 'medium' : baseRisk) : baseRisk;

      // related_claim_ids: same-section issues that reference this finding
      // For v1.5 we link the assumption to its source claim only
      const relatedClaimId = issueTitleToClaimId.get(issue.title);
      const relatedIds = relatedClaimId !== undefined ? [relatedClaimId] : [];

      co.assumptions.push({
        id: `A${assumptionIdx++}`,
        statement: `Finding inferred without direct evidence: "${issue.title}"`,
        source: 'inferred_from_pattern',
        risk,
        related_claim_ids: relatedIds,
      });
    }
  }
  co.counts.assumption = co.assumptions.length;
}

