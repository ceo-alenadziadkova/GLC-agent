import { describe, expect, it } from 'vitest';
import { intakeProgressiveStateKey } from '../lib/intake-brief-storage';

describe('useIntakeBriefProgressiveActions helpers', () => {
  it('persists progressive state under stable key', () => {
    expect(intakeProgressiveStateKey('progress-token')).toBe('glc:intake:progressive-state:progress-token');
  });
});
