import { calcAiReadinessScore } from '@glc/intake-core';
import {
  buildIntakePlan,
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
  responsesUseQuestionBankV1,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from '../../types/audit.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { resolveIntakeSurfaceForPlan } from '../brief-validator.js';
import type { ContextBuilderBriefRow } from './load-context-snapshot.js';
import { computeIntakeReportAnchors } from './lib/compute-intake-report-anchors.js';

export function enrichIntakeMetadata(params: {
  allResponses: Record<string, unknown>;
  brief: ContextBuilderBriefRow | null;
  productMode: ProductMode;
}): {
  intake_ai_readiness_score?: number;
  intake_report_anchors?: Record<string, string>;
  intake_missing_report_domains?: string[];
} {
  const { allResponses, brief, productMode } = params;

  if (!responsesUseQuestionBankV1(allResponses)) {
    return {};
  }

  const bankAiReadiness = calcAiReadinessScore(allResponses).score;
  const intakeReportAnchors = computeIntakeReportAnchors(allResponses);

  const collectionMode =
    (brief?.collection_mode as IntakeBriefCollectionMode | undefined) ??
    SYSTEM_DEFAULTS.intake.defaultBriefCollectionMode;
  const collectedBy = brief?.collected_by as 'client' | 'consultant' | undefined;
  const validationPerspective = collectedBy === 'consultant' ? 'consultant' : 'client';
  const intakeSurface = resolveIntakeSurfaceForPlan(collectionMode, validationPerspective);
  const storedTuple = brief?.intake_versions as IntakeVersionTuple | null | undefined;
  const intakeTuple =
    storedTuple && isSupportedIntakeArtifactTuple(storedTuple) ? storedTuple : currentIntakeVersionTuple();
  const intakePlan = buildIntakePlan({
    responses: allResponses,
    productMode,
    collectionMode,
    surface: intakeSurface,
    intakeVersionTuple: intakeTuple,
  });

  const intakeMissingReportDomains =
    intakePlan.missingForReport.length > 0 ? [...intakePlan.missingForReport] : undefined;

  return {
    intake_ai_readiness_score: bankAiReadiness,
    ...(intakeReportAnchors ? { intake_report_anchors: intakeReportAnchors } : {}),
    ...(intakeMissingReportDomains ? { intake_missing_report_domains: intakeMissingReportDomains } : {}),
  };
}
