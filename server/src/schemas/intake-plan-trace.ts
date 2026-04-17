import {
  INTAKE_PLAN_TRACE_COLLECTION_MODE_VALUES,
  INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES,
  INTAKE_SURFACE_VALUES,
} from '@glc/intake-core';
import { z } from 'zod';

import { DEFAULT_AUDIT_PRODUCT_MODE } from '../types/audit.js';

const productModeTuple = INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES as unknown as [string, ...string[]];
const collectionModeTuple = INTAKE_PLAN_TRACE_COLLECTION_MODE_VALUES as unknown as [string, ...string[]];
const surfaceTuple = INTAKE_SURFACE_VALUES as unknown as [string, ...string[]];

/** Match legacy route: non-string `productMode` falls back to default. */
const productModeField = z.preprocess(
  (val: unknown) => (typeof val === 'string' ? val : DEFAULT_AUDIT_PRODUCT_MODE),
  z.enum(productModeTuple),
);

/** Match legacy route: only string values are validated; other types omitted. */
const optionalEnumString = <T extends readonly [string, ...string[]]>(tuple: T) =>
  z.preprocess(
    (val: unknown) => (typeof val === 'string' ? val : undefined),
    z.enum(tuple).optional(),
  );

export const intakePlanTraceBodySchema = z.object({
  responses: z.preprocess(
    (val: unknown) =>
      val != null && typeof val === 'object' && !Array.isArray(val) ? val : {},
    z.record(z.string(), z.unknown()),
  ),
  productMode: productModeField,
  collectionMode: optionalEnumString(collectionModeTuple),
  surface: optionalEnumString(surfaceTuple),
});

export type IntakePlanTraceBody = z.infer<typeof intakePlanTraceBodySchema>;
