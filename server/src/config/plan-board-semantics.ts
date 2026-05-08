import { PLAN_BOARD_COLUMN_IDS } from './plan-board-columns.js';

/**
 * Semantic roles for Delivery Board columns — drive transitions, reconcile landing, client filter, strict manual IP.
 * Custom per-audit ids map 1:1 onto these keys via persisted `semantics`.
 */
export const PLAN_BOARD_SEMANTIC_KEYS = PLAN_BOARD_COLUMN_IDS;
export type PlanBoardSemanticKey = (typeof PLAN_BOARD_SEMANTIC_KEYS)[number];

/** Portal client may only see pack cards in these semantics (ADR Delivery Board). */
export const PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS: ReadonlySet<PlanBoardSemanticKey> = new Set([
  'next_up',
  'in_progress',
  'review',
  'done',
]);
