import {
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_PRODUCT_MODE,
  type AuditExecutionPlan,
  type DomainKey,
  type ProductMode,
} from '../../types/audit.js';
import { DOMAIN_TO_QUESTION_IDS, prepareBriefForValidation, responsesUseQuestionBankV1 } from '@glc/intake-core';
import { getQuestionsForDomain, INTAKE_IDENTITY_FIELD_IDS } from '../../schemas/intake-brief.js';
import { normalizeExecutionPlan } from '../execution-plan.js';
import type { ContextBuilderAuditRow } from './load-context-snapshot.js';
import { extractPrimaryCompetitor } from './lib/extract-primary-competitor.js';
import { unwrapBriefResponse } from './lib/unwrap-brief-response.js';

const OTHER_SUFFIX = '__other';

export function assembleBriefResponses(params: {
  domainKey: DomainKey | 'recon' | 'strategy';
  allResponses: Record<string, unknown>;
  audit: ContextBuilderAuditRow;
}): {
  briefResponses: Record<string, string | string[] | number | boolean | null>;
  briefResponseSources: Record<string, string>;
  productMode: ProductMode;
} {
  const { domainKey, allResponses, audit } = params;

  const briefResponses: Record<string, string | string[] | number | boolean | null> = {};
  const briefResponseSources: Record<string, string> = {};

  const domainQuestions = getQuestionsForDomain(domainKey);
  for (const q of domainQuestions) {
    const val = allResponses[q.id];
    if (val !== undefined) {
      const parsed = unwrapBriefResponse(val);
      briefResponses[q.id] = parsed.value;
      briefResponseSources[q.id] = parsed.source;
    }
  }

  for (const id of INTAKE_IDENTITY_FIELD_IDS) {
    const val = allResponses[id];
    if (val === undefined) continue;
    const parsed = unwrapBriefResponse(val);
    briefResponses[id] = parsed.value;
    briefResponseSources[id] = parsed.source;
  }

  if (responsesUseQuestionBankV1(allResponses)) {
    const bankIds = DOMAIN_TO_QUESTION_IDS[domainKey as keyof typeof DOMAIN_TO_QUESTION_IDS];
    if (bankIds) {
      for (const id of bankIds) {
        const val = allResponses[id];
        if (val === undefined) continue;
        const parsed = unwrapBriefResponse(val);
        briefResponses[id] = parsed.value;
        briefResponseSources[id] = parsed.source;
      }
    }
  }

  const productMode = (audit.product_mode as ProductMode | undefined) ?? DEFAULT_AUDIT_PRODUCT_MODE;

  const executionPlan = normalizeExecutionPlan(
    (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    productMode,
  );
  if (
    executionPlan.coverage_package !== COMPLETE_AUDIT_COVERAGE_PACKAGE &&
    briefResponses.main_competitors != null
  ) {
    briefResponses.main_competitors = extractPrimaryCompetitor(briefResponses.main_competitors);
  }

  for (const [k, val] of Object.entries(allResponses)) {
    if (!k.endsWith(OTHER_SUFFIX)) continue;
    const parent = k.slice(0, -OTHER_SUFFIX.length);
    if (!(parent in briefResponses)) continue;
    const parsed = unwrapBriefResponse(val);
    briefResponses[k] = parsed.value;
    briefResponseSources[k] = parsed.source;
  }

  return { briefResponses, briefResponseSources, productMode };
}

export function prepareAllBriefResponses(briefResponsesRaw: unknown): Record<string, unknown> {
  return prepareBriefForValidation((briefResponsesRaw as Record<string, unknown>) ?? {}) as Record<string, unknown>;
}
