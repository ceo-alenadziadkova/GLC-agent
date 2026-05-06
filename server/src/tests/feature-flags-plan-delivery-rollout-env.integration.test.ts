/**
 * Integration: env wiring for `getPlanDeliveryBoardRolloutMode` only.
 * **This file is the dedicated place** to assert `process.env.FEATURE_*` / `PLAN_DELIVERY_BOARD` mapping into
 * `feature-flags.ts` after `vi.resetModules()`. All other server tests should mock `../config/feature-flags.js`
 * (`importOriginal` + overrides) or `vi.spyOn` exports — do not sprinkle FEATURE_* in unit tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const keys = ['FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE', 'PLAN_DELIVERY_BOARD'] as const;
const snapshot = new Map<string, string | undefined>(keys.map((k) => [k, process.env[k]]));

function restoreEnv(): void {
  for (const [k, v] of snapshot) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe('getPlanDeliveryBoardRolloutMode (env integration)', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('uses explicit FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE when set', async () => {
    delete process.env.PLAN_DELIVERY_BOARD;
    process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE = 'pilot';
    const { getPlanDeliveryBoardRolloutMode } = await import('../config/feature-flags.js');
    expect(getPlanDeliveryBoardRolloutMode()).toBe('pilot');
  });

  it('PLAN_DELIVERY_BOARD=true maps to internal when rollout env is unset', async () => {
    delete process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE;
    process.env.PLAN_DELIVERY_BOARD = 'true';
    const { getPlanDeliveryBoardRolloutMode } = await import('../config/feature-flags.js');
    expect(getPlanDeliveryBoardRolloutMode()).toBe('internal');
  });

  it('PLAN_DELIVERY_BOARD=false maps to shadow when rollout env is unset', async () => {
    delete process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE;
    process.env.PLAN_DELIVERY_BOARD = 'false';
    const { getPlanDeliveryBoardRolloutMode } = await import('../config/feature-flags.js');
    expect(getPlanDeliveryBoardRolloutMode()).toBe('shadow');
  });

  it('explicit rollout wins over PLAN_DELIVERY_BOARD shorthand', async () => {
    process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE = 'shadow';
    process.env.PLAN_DELIVERY_BOARD = 'true';
    const { getPlanDeliveryBoardRolloutMode } = await import('../config/feature-flags.js');
    expect(getPlanDeliveryBoardRolloutMode()).toBe('shadow');
  });

  it('falls back to SYSTEM_DEFAULTS when neither env is set', async () => {
    delete process.env.FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE;
    delete process.env.PLAN_DELIVERY_BOARD;
    const { getPlanDeliveryBoardRolloutMode } = await import('../config/feature-flags.js');
    expect(getPlanDeliveryBoardRolloutMode()).toBe(SYSTEM_DEFAULTS.featureFlags.planDeliveryBoardRolloutMode);
  });
});
