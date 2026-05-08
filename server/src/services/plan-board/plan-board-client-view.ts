import { PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS } from '../../config/plan-board-semantics.js';

/** Default client-visible column ids when semantics map is identity (`id === semantic`). */
export function defaultPlanBoardClientVisibleColumnIds(): ReadonlySet<string> {
  return new Set(PLAN_BOARD_CLIENT_VISIBLE_SEMANTICS) as ReadonlySet<string>;
}

export type PlanBoardCardRowLike = {
  source: string;
  column_id: string;
  delivery_area: string;
};

/**
 * Portal client may only see pack workflow columns (ADR §10); semantics `next_up`…`done` projected to concrete ids via policy.
 */
export function filterPlanBoardCardsForClientView<T extends PlanBoardCardRowLike>(
  cards: readonly T[],
  clientVisibleColumnIds?: ReadonlySet<string>,
): T[] {
  const visible = clientVisibleColumnIds ?? defaultPlanBoardClientVisibleColumnIds();
  return cards.filter(
    (c) => c.source === 'pack' && c.delivery_area !== 'archived' && visible.has(c.column_id),
  );
}

export function isPlanBoardCardRowVisibleToClient(
  row: PlanBoardCardRowLike,
  clientVisibleColumnIds?: ReadonlySet<string>,
): boolean {
  return filterPlanBoardCardsForClientView([row], clientVisibleColumnIds).length > 0;
}
