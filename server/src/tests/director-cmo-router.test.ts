import { describe, expect, it } from 'vitest';
import { routeCmoOperatingMode } from '../services/orchestration/director-cmo-router.service.js';

describe('routeCmoOperatingMode', () => {
  it('uses requested mode when provided', () => {
    expect(
      routeCmoOperatingMode({
        goals: ['Grow pipeline'],
        constraints: [],
        requestedMode: 'authority',
      }),
    ).toBe('authority');
  });

  it('infers launch mode from launch signal', () => {
    expect(
      routeCmoOperatingMode({
        goals: ['Launch MVP with lead-gen'],
        constraints: [],
      }),
    ).toBe('launch');
  });

  it('falls back to defense mode for risk constraints', () => {
    expect(
      routeCmoOperatingMode({
        goals: ['Increase demand'],
        constraints: ['Legal and compliance risk is high'],
      }),
    ).toBe('defense');
  });
});
