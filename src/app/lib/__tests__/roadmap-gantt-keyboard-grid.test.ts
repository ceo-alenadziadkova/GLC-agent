import { describe, expect, it } from 'vitest';

import { ROADMAP_GANTT_DAY_MS } from '../../config/roadmap-gantt-view-preferences';
import {
  pickArrowKeyMsDelta,
  pickGridShortcutAction,
} from '../roadmap-gantt-keyboard-grid';

describe('pickArrowKeyMsDelta', () => {
  it('maps the four arrow keys to ms deltas', () => {
    expect(pickArrowKeyMsDelta('ArrowLeft')).toBe(-ROADMAP_GANTT_DAY_MS);
    expect(pickArrowKeyMsDelta('ArrowRight')).toBe(ROADMAP_GANTT_DAY_MS);
    expect(pickArrowKeyMsDelta('ArrowUp')).toBe(-7 * ROADMAP_GANTT_DAY_MS);
    expect(pickArrowKeyMsDelta('ArrowDown')).toBe(7 * ROADMAP_GANTT_DAY_MS);
  });

  it('returns 0 for unknown keys', () => {
    expect(pickArrowKeyMsDelta('Enter')).toBe(0);
    expect(pickArrowKeyMsDelta('Tab')).toBe(0);
    expect(pickArrowKeyMsDelta('')).toBe(0);
  });
});

describe('pickGridShortcutAction', () => {
  it('maps "?" to help', () => {
    expect(pickGridShortcutAction('?')).toEqual({ kind: 'help' });
  });

  it.each([
    ['t', 'panel-timeline'],
    ['T', 'panel-timeline'],
    ['d', 'panel-deps'],
    ['g', 'tab-graph'],
    ['b', 'tab-table'],
    ['a', 'toolbar-more'],
    ['r', 'reset'],
    ['m', 'lane-menu'],
  ] as const)('maps "%s" to %s', (key, kind) => {
    expect(pickGridShortcutAction(key)).toEqual({ kind });
  });

  it('returns noop for unknown keys', () => {
    expect(pickGridShortcutAction('z')).toEqual({ kind: 'noop' });
    expect(pickGridShortcutAction('Enter')).toEqual({ kind: 'noop' });
    expect(pickGridShortcutAction('')).toEqual({ kind: 'noop' });
  });
});
