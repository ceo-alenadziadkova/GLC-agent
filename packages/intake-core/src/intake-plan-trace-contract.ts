/**
 * Allowed string values for POST /api/intake/plan-trace (consultant debug).
 * Single source of truth for validation sets; keep aligned with API.md and `buildIntakePlan` callers.
 */
import type { IntakeSurface } from './core/types.js';

/** `productMode` body field — extends DB `ProductMode` with plan-scenario labels (`discovery`, `pre_brief`). */
export const INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES = [
  'full',
  'express',
  'discovery',
  'pre_brief',
  'free_snapshot',
] as const;

export type IntakePlanTraceProductMode = (typeof INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES)[number];

/**
 * `collectionMode` body field for plan-trace (API vocabulary).
 * Note: differs from persisted `IntakeBriefCollectionMode` (`self_serve` | `interview` | …) in some labels;
 * callers may pass these strings through to `buildIntakePlan` per route contract.
 */
export const INTAKE_PLAN_TRACE_COLLECTION_MODE_VALUES = [
  'full',
  'discovery',
  'pre_brief',
  'express',
  'free_snapshot',
] as const;

export type IntakePlanTraceCollectionMode = (typeof INTAKE_PLAN_TRACE_COLLECTION_MODE_VALUES)[number];

/** `surface` body field — must match `IntakeSurface`. */
export const INTAKE_SURFACE_VALUES = [
  'consultant_interview',
  'client_form',
  'client_portal',
  'internal_review',
  'public_discovery',
] as const satisfies readonly IntakeSurface[];
