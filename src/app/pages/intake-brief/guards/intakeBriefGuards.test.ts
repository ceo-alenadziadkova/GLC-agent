import { describe, expect, it } from 'vitest';
import { isReliableSource, shouldForceProgressiveMode } from './intakeBriefGuards';

describe('intakeBriefGuards', () => {
  it('detects reliable source', () => {
    expect(isReliableSource({ value: 'x', source: 'client' })).toBe(true);
    expect(isReliableSource({ value: 'x', source: 'unknown' })).toBe(false);
  });

  it('returns boolean for progressive mode guard', () => {
    expect(typeof shouldForceProgressiveMode('all_questions')).toBe('boolean');
  });
});
