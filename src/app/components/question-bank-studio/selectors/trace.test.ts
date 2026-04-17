import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@glc/intake-core', () => ({
  getQuestionBankPromptLabel: vi.fn(),
}));

import { getQuestionBankPromptLabel } from '@glc/intake-core';
import {
  idsInIntakePlan,
  planTraceRoles,
  shortUserLabel,
  statusPill,
  traceRingColor,
} from './trace';

describe('question-bank-studio trace selectors', () => {
  it('shortUserLabel trims and truncates at configured limits', () => {
    (getQuestionBankPromptLabel as unknown as Mock).mockReturnValue('  abc  ');
    expect(shortUserLabel('some-id')).toBe('abc');

    (getQuestionBankPromptLabel as unknown as Mock).mockReturnValue('a'.repeat(80));
    expect(shortUserLabel('some-id')).toBe('a'.repeat(75) + '...');
  });

  it('planTraceRoles assigns hidden/deferred/visible/required with precedence', () => {
    const plan = {
      hidden: ['q1'],
      deferred: ['q2'],
      visible: ['q1', 'q3'],
      required: ['q4'],
      // not used by planTraceRoles but keeps test objects simple
    } as any;

    const m = planTraceRoles(plan);
    expect(m.get('q1')).toBe('hidden');
    expect(m.get('q2')).toBe('deferred');
    expect(m.get('q3')).toBe('visible');
    expect(m.get('q4')).toBe('required');
  });

  it('idsInIntakePlan returns a union of all footprint id lists', () => {
    const plan = {
      eligible: ['e1'],
      visible: ['v1'],
      required: ['r1'],
      hidden: ['h1'],
      deferred: ['d1'],
    } as any;

    const s = idsInIntakePlan(plan);
    expect(s.has('e1')).toBe(true);
    expect(s.has('v1')).toBe(true);
    expect(s.has('r1')).toBe(true);
    expect(s.has('h1')).toBe(true);
    expect(s.has('d1')).toBe(true);
  });

  it('traceRingColor + statusPill return stable presentation mappings', () => {
    expect(traceRingColor('required')).toBe('#f59e0b');
    expect(traceRingColor('hidden')).toBe('#71717a');

    expect(statusPill('required').label).toBe('Required');
    expect(statusPill('unknown').label).toBe('Unknown');
  });
});

