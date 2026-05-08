import { describe, expect, it } from 'vitest';
import { intakeProgressiveStateKey } from '../lib/intake-brief-storage';

describe('useIntakeBriefSubmissionActions helpers', () => {
  it('uses stable progressive storage key for submit cleanup', () => {
    expect(intakeProgressiveStateKey('abc')).toBe('glc:intake:progressive-state:abc');
  });
});
