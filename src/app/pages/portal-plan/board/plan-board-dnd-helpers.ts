import { arrayMove } from '@dnd-kit/sortable';
import type { UniqueIdentifier } from '@dnd-kit/core';

export function emptyOperationalColumnBuckets(columnIds: readonly string[]): Record<string, string[]> {
  return Object.fromEntries(columnIds.map((c) => [c, []]));
}

export function cloneBuckets(columns: Record<string, string[]>): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const k of Object.keys(columns)) {
    next[k] = [...(columns[k] ?? [])];
  }
  return next;
}

export function findColumn(columns: Record<string, string[]>, id: UniqueIdentifier): string | undefined {
  const s = String(id);
  if (Object.prototype.hasOwnProperty.call(columns, s)) return s;
  for (const [col, ids] of Object.entries(columns)) {
    if (ids.includes(s)) return col;
  }
  return undefined;
}

export function applyBucketDrag(
  columns: Record<string, string[]>,
  activeId: string,
  overId: string,
): Record<string, string[]> | null {
  if (String(activeId) === String(overId)) return null;

  const activeColumn = findColumn(columns, activeId);
  if (!activeColumn) return null;

  const overIsBucket = Object.prototype.hasOwnProperty.call(columns, String(overId));
  const overColumn = overIsBucket ? String(overId) : findColumn(columns, overId);
  if (!overColumn) return null;

  if (activeColumn === overColumn) {
    const list = [...(columns[activeColumn] ?? [])];
    const oldIndex = list.indexOf(activeId);
    if (oldIndex < 0) return null;

    const droppedOnColumnChrome = overIsBucket && String(overId) === activeColumn;
    const newIndex = list.indexOf(String(overId));

    let nextRow: string[] | undefined;
    if (droppedOnColumnChrome) {
      if (oldIndex === list.length - 1) return null;
      const reorder = [...list];
      reorder.splice(oldIndex, 1);
      reorder.push(activeId);
      nextRow = reorder;
    } else {
      if (newIndex < 0) return null;
      if (oldIndex === newIndex) return null;
      nextRow = arrayMove(list, oldIndex, newIndex);
    }

    const nextBuckets = cloneBuckets(columns);
    nextBuckets[activeColumn] = nextRow!;
    return nextBuckets;
  }

  const next = cloneBuckets(columns);
  const fromList = [...(next[activeColumn] ?? [])];
  const fi = fromList.indexOf(activeId);
  if (fi < 0) return null;
  fromList.splice(fi, 1);
  next[activeColumn] = fromList;

  const dest = [...(next[overColumn] ?? [])];

  let insertIdx: number;
  if (overIsBucket && String(overId) === overColumn) insertIdx = dest.length;
  else {
    insertIdx = dest.indexOf(String(overId));
    if (insertIdx < 0) insertIdx = dest.length;
  }

  dest.splice(insertIdx, 0, activeId);
  next[overColumn] = dest;

  return next;
}

export function moveCardIntoColumn(
  columns: Record<string, string[]>,
  cardId: string,
  targetCol: string,
): Record<string, string[]> | null {
  const next = cloneBuckets(columns);
  let removed = false;
  for (const k of Object.keys(next)) {
    const idx = next[k]?.indexOf(cardId) ?? -1;
    if (idx >= 0) {
      next[k]!.splice(idx, 1);
      removed = true;
    }
  }
  if (!removed) return null;
  next[targetCol] ??= [];
  next[targetCol]!.push(cardId);
  return next;
}
