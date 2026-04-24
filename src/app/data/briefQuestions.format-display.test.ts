import { describe, expect, it } from 'vitest';
import { formatBriefResponseCellForDisplay } from './briefQuestions';

const L = {
  unknown: 'Unknown',
  yes: 'Y',
  no: 'N',
  empty: '—',
} as const;

describe('formatBriefResponseCellForDisplay', () => {
  it('formats string, number, boolean, arrays', () => {
    expect(formatBriefResponseCellForDisplay({ value: '  hi  ', source: 'client' }, L)).toBe('hi');
    expect(formatBriefResponseCellForDisplay({ value: 3, source: 'client' }, L)).toBe('3');
    expect(formatBriefResponseCellForDisplay({ value: true, source: 'client' }, L)).toBe('Y');
    expect(formatBriefResponseCellForDisplay({ value: false, source: 'client' }, L)).toBe('N');
    expect(
      formatBriefResponseCellForDisplay({ value: ['a', ' b '], source: 'client' }, L),
    ).toBe('a, b');
  });

  it('uses unknown label for explicit unknown source', () => {
    expect(formatBriefResponseCellForDisplay({ value: null, source: 'unknown' }, L)).toBe('Unknown');
  });

  it('uses empty label for blank', () => {
    expect(formatBriefResponseCellForDisplay(undefined, L)).toBe('—');
    expect(formatBriefResponseCellForDisplay({ value: '', source: 'client' }, L)).toBe('—');
    expect(formatBriefResponseCellForDisplay({ value: [], source: 'client' }, L)).toBe('—');
  });
});
