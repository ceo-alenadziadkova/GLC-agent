/**
 * IntakePlan derived layer (ADR): facts, domain coverage, confidence heuristics.
 */
import { calcAiReadinessScore } from '../ai-readiness.js';
import { normalizeWebsiteGate } from '../branch-rules.js';
import { calcDataQualityScoreFromVisible } from '../data-quality.js';
import { getQuestionBankReportUse } from '../question-bank.js';
import { SLICE_DOMAIN_ORDER, QUESTION_FEED_ROLES } from '../question-feed-roles.js';
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';
import { getResponseString, isIntakeAnswered } from '../unwrap.js';

import type {
  IntakePlanConfidence,
  IntakePlanCoverage,
  IntakePlanCoverageDomain,
  IntakePlanDerivedFacts,
} from './types.js';

function visibleStubsForPlan(visibleBankIds: string[], stubs: IntakeQuestionStub[]): IntakeQuestionStub[] {
  const order = new Map(visibleBankIds.map((id, i) => [id, i]));
  return stubs
    .filter(s => order.has(s.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function computeIntakePlanDerived(args: {
  responses: IntakeResponsesMap;
  slaVisibleBankIds: string[];
  visibleBankIds: string[];
  stubs: IntakeQuestionStub[];
}): {
  derivedFacts: IntakePlanDerivedFacts;
  coverage: IntakePlanCoverage;
  confidence: IntakePlanConfidence;
  missingForReport: IntakePlanCoverageDomain[];
} {
  const { responses, slaVisibleBankIds, visibleBankIds, stubs } = args;
  const slaSet = new Set(slaVisibleBankIds);
  const ai = calcAiReadinessScore(responses);

  const byDomain: IntakePlanCoverage['byDomain'] = {};
  const missingForReport: IntakePlanCoverageDomain[] = [];
  for (const domain of SLICE_DOMAIN_ORDER) {
    let total = 0;
    let answered = 0;
    for (const id of slaSet) {
      const roles = QUESTION_FEED_ROLES[id];
      if (!roles?.primary.includes(domain)) continue;
      total += 1;
      if (isIntakeAnswered(responses[id])) answered += 1;
    }
    byDomain[domain] = total === 0 ? 1 : answered / total;
    if (total > 0 && answered < total) {
      missingForReport.push(domain);
    }
  }

  const visibleStubs = visibleStubsForPlan(visibleBankIds, stubs);
  const dq = calcDataQualityScoreFromVisible(visibleStubs, responses);
  const arNorm = ai.score / 100;
  const overall = Math.min(1, Math.max(0, arNorm * 0.45 + dq.score * 0.55));

  const reportAnchors: Record<string, string> = {};
  for (const id of visibleBankIds) {
    if (!isIntakeAnswered(responses[id])) continue;
    const tag = getQuestionBankReportUse(id);
    if (!tag) continue;
    const s = getResponseString(responses, id);
    if (s.length === 0) continue;
    if (reportAnchors[tag] !== undefined) continue;
    reportAnchors[tag] = s;
  }

  const derivedFacts: IntakePlanDerivedFacts = {
    aiReadinessScore: ai.score,
    aiReadinessComponents: ai.components,
    segmentHints: {
      websiteGate: normalizeWebsiteGate(responses),
    },
    ...(Object.keys(reportAnchors).length > 0 ? { reportAnchors } : {}),
  };

  const confidence: IntakePlanConfidence = {
    overall,
    rationale: [
      `aiReadinessNormalized=${arNorm.toFixed(3)}`,
      `visibleDataQuality=${dq.score.toFixed(3)}`,
    ],
  };

  return { derivedFacts, coverage: { byDomain }, confidence, missingForReport };
}
