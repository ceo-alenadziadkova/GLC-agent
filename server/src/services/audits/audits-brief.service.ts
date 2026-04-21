import type { AuditExecutionPlan, IntakeBriefCollectionMode, IntakeVersionTuple } from '../../types/audit.js';
import {
  buildBriefSchemaSnapshot,
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
  parseIntakeVersionsBody,
  validateIntakeVersionsForBriefWrite,
} from '@glc/intake-core';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  saveBriefResponses,
  validateBriefResponses,
  validationPerspectiveForBriefAccess,
} from '../brief-validator.js';
import { intakeBriefGateModeFromPartialPlan } from '../../lib/audit-coverage-bridge.js';
import { getBriefQuestionsByIds } from '../../schemas/intake-brief.js';
import { BRIEF_COLLECTION_MODES } from '../../routes/audits/config/audits-route-policy.js';
import {
  makeIncompleteIntakeVersionsError,
  makeIntakeVersionConflictError,
  makeInvalidCollectionModeError,
  makeSaveBriefFailedError,
  makeUnsupportedIntakeVersionError,
} from '../../config/brief-validation-errors.js';

export function resolveCollectionModeOrThrow(input: unknown): IntakeBriefCollectionMode | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (typeof input !== 'string') throw makeInvalidCollectionModeError();
  if (!BRIEF_COLLECTION_MODES.includes(input as IntakeBriefCollectionMode)) {
    throw makeInvalidCollectionModeError();
  }
  return input as IntakeBriefCollectionMode;
}

export function buildBriefContext(args: {
  audit: { execution_plan: unknown; user_id: string; client_id: string | null };
  brief: { collection_mode?: unknown; intake_versions?: unknown; responses?: unknown } | null;
  actorUserId: string;
}) {
  const responses = (args.brief?.responses as Record<string, unknown>) ?? {};
  const collectionMode = (args.brief?.collection_mode as IntakeBriefCollectionMode | undefined) ?? 'self_serve';
  const perspective = validationPerspectiveForBriefAccess(
    args.audit.user_id,
    args.audit.client_id,
    args.actorUserId,
  );
  const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
  const iv = args.brief?.intake_versions as IntakeVersionTuple | null | undefined;
  const intakeTuple = iv && isSupportedIntakeArtifactTuple(iv) ? iv : currentIntakeVersionTuple();
  const briefMode = intakeBriefGateModeFromPartialPlan(
    (args.audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
  );
  return { responses, collectionMode, perspective, surface, intakeTuple, briefMode };
}

export function buildBriefSchemaPayload(args: {
  audit: { execution_plan: unknown; user_id: string; client_id: string | null };
  brief: { collection_mode?: unknown; intake_versions?: unknown; responses?: unknown } | null;
  actorUserId: string;
}) {
  const context = buildBriefContext(args);
  return buildBriefSchemaSnapshot({
    responses: context.responses,
    productMode: context.briefMode,
    collectionMode: context.collectionMode,
    surface: context.surface,
    intakeVersionTuple: context.intakeTuple,
  });
}

export function buildBriefReadPayload(args: {
  audit: { product_mode: string; execution_plan: unknown; user_id: string; client_id: string | null };
  brief: { collection_mode?: unknown; intake_versions?: unknown; responses?: unknown } | null;
  actorUserId: string;
}) {
  const context = buildBriefContext(args);
  const validation = validateBriefResponses(context.responses, {
    productMode: context.briefMode,
    collectionMode: context.collectionMode,
    surface: context.surface,
    intakeVersionTuple: context.intakeTuple,
  });
  const gates = evaluateBriefGates(
    context.responses,
    context.briefMode,
    context.collectionMode,
    context.surface,
    context.intakeTuple,
  );
  const snapshot = buildBriefSchemaSnapshot({
    responses: context.responses,
    productMode: context.briefMode,
    collectionMode: context.collectionMode,
    surface: context.surface,
    intakeVersionTuple: context.intakeTuple,
  });
  return {
    questions: getBriefQuestionsByIds(snapshot.visible),
    validation,
    gates,
    intakeProgress: gates.intakeProgress,
    readiness: snapshot.readiness,
    critical_signals: snapshot.critical_signals,
    remediation_queue: snapshot.remediation_queue,
    /** Same ordering as `GET …/brief/schema` after pilot sequencing (server authority). */
    next_recommended: [...snapshot.next_recommended],
  };
}

export async function saveBriefWithValidation(args: {
  auditId: string;
  actorUserId: string;
  audit: { execution_plan: unknown; user_id: string; client_id: string | null };
  responses: Record<string, unknown>;
  collectionModeRaw: unknown;
  intakeVersionsRaw: unknown;
  storedVersions: IntakeVersionTuple | null;
}) {
  const collectionMode = resolveCollectionModeOrThrow(args.collectionModeRaw);
  const parsedVersions = parseIntakeVersionsBody(args.intakeVersionsRaw);
  if (parsedVersions.kind === 'incomplete') throw makeIncompleteIntakeVersionsError();
  const vr = validateIntakeVersionsForBriefWrite({
    parsedFromBody: parsedVersions.kind === 'full' ? parsedVersions.tuple : undefined,
    stored: args.storedVersions,
  });
  if (!vr.ok) {
    const body = vr.body as { code: string; received?: unknown; supportedHint?: string; stored?: unknown };
    if (body.code === 'UNSUPPORTED_INTAKE_VERSION') {
      throw makeUnsupportedIntakeVersionError({
        received: body.received,
        supportedHint: body.supportedHint,
      });
    }
    if (body.code === 'INTAKE_VERSION_CONFLICT') {
      throw makeIntakeVersionConflictError({
        stored: body.stored,
        received: body.received,
      });
    }
    throw makeSaveBriefFailedError('unexpected intake version validation outcome');
  }

  const perspective = validationPerspectiveForBriefAccess(
    args.audit.user_id,
    args.audit.client_id,
    args.actorUserId,
  );
  const { brief, gates } = await saveBriefResponses(args.auditId, args.responses, {
    ...(collectionMode ? { collection_mode: collectionMode } : {}),
    validation_perspective: perspective,
    effective_intake_versions: vr.effective,
    ...(vr.migration ? { intake_version_migration: vr.migration } : {}),
  });

  const context = buildBriefContext({
    audit: args.audit,
    brief: brief as { collection_mode?: unknown; intake_versions?: unknown; responses?: unknown },
    actorUserId: args.actorUserId,
  });
  const validation = validateBriefResponses(brief.responses as Record<string, unknown>, {
    productMode: context.briefMode,
    collectionMode: brief.collection_mode as IntakeBriefCollectionMode,
    surface: context.surface,
    intakeVersionTuple: context.intakeTuple,
  });
  return { brief, gates, validation };
}
