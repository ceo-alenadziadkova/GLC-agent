import type { Response } from 'express';

import {
  buildIntakePlan,
  formatPlanTrace,
  INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES,
  INTAKE_SURFACE_VALUES,
  isSupportedIntakeArtifactTuple,
  parseIntakeVersionTuple,
} from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';

import {
  API_ERROR_CODES,
  INTAKE_PLAN_TRACE_FAILED_MESSAGE,
  INTAKE_VERSION_TUPLE_UNSUPPORTED_MESSAGE,
  apiErrorJson,
  intakeCollectionModeInvalidMessage,
  intakeProductModeInvalidMessage,
  intakeResponsesSchemaInvalidMessage,
  intakeSurfaceInvalidMessage,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { intakePlanTraceBodySchema } from '../../../schemas/intake-plan-trace.js';
import { logger } from '../../../services/logger.js';
import { DEFAULT_AUDIT_PRODUCT_MODE, type IntakeBriefCollectionMode, type ProductMode } from '../../../types/audit.js';

function firstPathKey(issue: { path: (string | number)[] }): string | undefined {
  const head = issue.path[0];
  return typeof head === 'string' ? head : undefined;
}

export async function postIntakePlanTraceController(req: AuthRequest, res: Response) {
  try {
    const rawBody = req.body ?? {};
    const parsed = intakePlanTraceBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = firstPathKey(issue);
      if (key === 'productMode') {
        const rawMode =
          typeof rawBody.productMode === 'string' ? rawBody.productMode : DEFAULT_AUDIT_PRODUCT_MODE;
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_PRODUCT_MODE_INVALID,
              intakeProductModeInvalidMessage(rawMode, [...INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES].join(', ')),
            ),
          );
        return;
      }
      if (key === 'collectionMode') {
        const rawCollection = typeof rawBody.collectionMode === 'string' ? rawBody.collectionMode : '';
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_COLLECTION_MODE_INVALID,
              intakeCollectionModeInvalidMessage(rawCollection),
            ),
          );
        return;
      }
      if (key === 'surface') {
        const rawSurface = typeof rawBody.surface === 'string' ? rawBody.surface : '';
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_SURFACE_INVALID,
              intakeSurfaceInvalidMessage(rawSurface, [...INTAKE_SURFACE_VALUES].join(', ')),
            ),
          );
        return;
      }
      if (key === 'responses') {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID,
              intakeResponsesSchemaInvalidMessage(issue.message),
            ),
          );
        return;
      }
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_PRODUCT_MODE_INVALID,
            intakeProductModeInvalidMessage(
              typeof rawBody.productMode === 'string' ? rawBody.productMode : DEFAULT_AUDIT_PRODUCT_MODE,
              [...INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES].join(', '),
            ),
          ),
        );
      return;
    }

    const { responses, productMode, collectionMode, surface } = parsed.data;
    const intakeVersionTuple =
      rawBody.intakeVersionTuple != null ? parseIntakeVersionTuple(rawBody.intakeVersionTuple) : undefined;

    if (intakeVersionTuple !== undefined && !isSupportedIntakeArtifactTuple(intakeVersionTuple)) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_VERSION_TUPLE_UNSUPPORTED,
            INTAKE_VERSION_TUPLE_UNSUPPORTED_MESSAGE,
          ),
        );
      return;
    }

    const plan = buildIntakePlan({
      responses,
      productMode: productMode as ProductMode,
      collectionMode: collectionMode as IntakeBriefCollectionMode | undefined,
      surface: surface as IntakeSurface | undefined,
      intakeVersionTuple,
    });
    const text = formatPlanTrace(plan, {
      productMode: productMode as ProductMode,
      collectionMode: collectionMode as IntakeBriefCollectionMode | undefined,
      surface: surface as IntakeSurface | undefined,
    });

    res.json({ plan, text });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.plan_trace_exception', { component: 'intake', error: e.message });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_PLAN_TRACE_FAILED, INTAKE_PLAN_TRACE_FAILED_MESSAGE, {
          detail: e.message,
        }),
      );
  }
}
