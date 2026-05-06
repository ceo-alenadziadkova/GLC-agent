import { describe, expect, it } from 'vitest';

import { shouldBlockManualCardEnteringOperationalInProgress } from '../config/plan-board-operational-policy.js';

describe('shouldBlockManualCardEnteringOperationalInProgress', () => {
  it('returns false when strict mode is off', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: false,
        source: 'manual',
        currentColumnId: 'next_up',
        requestedToColumn: 'in_progress',
      }),
    ).toBe(false);
  });

  it('returns false for pack-backed cards', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: true,
        source: 'pack',
        currentColumnId: 'next_up',
        requestedToColumn: 'in_progress',
      }),
    ).toBe(false);
  });

  it('allows manual PATCH that only adjusts position inside in_progress', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: true,
        source: 'manual',
        currentColumnId: 'in_progress',
        requestedToColumn: 'in_progress',
      }),
    ).toBe(false);
  });

  it('allows manual PATCH with no destination column', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: true,
        source: 'manual',
        currentColumnId: 'next_up',
        requestedToColumn: undefined,
      }),
    ).toBe(false);
  });

  it('blocks manual card entering in_progress when strict enabled', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: true,
        source: 'manual',
        currentColumnId: 'next_up',
        requestedToColumn: 'in_progress',
      }),
    ).toBe(true);
  });

  it('allows leaving in_progress toward another column', () => {
    expect(
      shouldBlockManualCardEnteringOperationalInProgress({
        strictEnabled: true,
        source: 'manual',
        currentColumnId: 'in_progress',
        requestedToColumn: 'review',
      }),
    ).toBe(false);
  });
});
