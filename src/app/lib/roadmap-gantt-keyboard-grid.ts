import { ROADMAP_GANTT_DAY_MS } from '../config/roadmap-gantt-view-preferences';

export type RoadmapGanttGridShortcutKind =
  | 'panel-timeline'
  | 'panel-deps'
  | 'tab-graph'
  | 'tab-table'
  | 'toolbar-more'
  | 'reset'
  | 'help'
  | 'lane-menu'
  | 'noop';

export type RoadmapGanttGridShortcutAction = { kind: RoadmapGanttGridShortcutKind };

/**
 * Translate an arrow key into a horizontal time delta (milliseconds) used by keyboard
 * navigation across the Gantt grid. Vertical arrows step a full week; horizontal arrows
 * step a single day. Unknown keys map to `0` (caller should ignore).
 */
export function pickArrowKeyMsDelta(key: string): number {
  if (key === 'ArrowLeft') return -ROADMAP_GANTT_DAY_MS;
  if (key === 'ArrowRight') return ROADMAP_GANTT_DAY_MS;
  if (key === 'ArrowUp') return -7 * ROADMAP_GANTT_DAY_MS;
  if (key === 'ArrowDown') return 7 * ROADMAP_GANTT_DAY_MS;
  return 0;
}

/**
 * Decide which non-arrow shortcut should fire on the timeline grid. Returns `noop` for
 * keys that do not match any shortcut, so the caller can safely fall through to arrow
 * handling without further branching.
 */
export function pickGridShortcutAction(key: string): RoadmapGanttGridShortcutAction {
  if (key === '?') return { kind: 'help' };
  const lower = key.toLowerCase();
  switch (lower) {
    case 't':
      return { kind: 'panel-timeline' };
    case 'd':
      return { kind: 'panel-deps' };
    case 'g':
      return { kind: 'tab-graph' };
    case 'b':
      return { kind: 'tab-table' };
    case 'a':
      return { kind: 'toolbar-more' };
    case 'r':
      return { kind: 'reset' };
    case 'm':
      return { kind: 'lane-menu' };
    default:
      return { kind: 'noop' };
  }
}
