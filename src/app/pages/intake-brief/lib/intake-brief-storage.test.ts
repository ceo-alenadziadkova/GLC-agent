import { describe, expect, it } from 'vitest';
import { intakeEntryModeStorageKey, intakeProgressiveStateKey } from './intake-brief-storage';

describe('intake-brief-storage', () => {
  it('builds stable storage keys', () => {
    expect(intakeProgressiveStateKey('token1')).toBe('glc:intake:progressive-state:token1');
    expect(intakeEntryModeStorageKey('token1')).toBe('glc:intake:entry-mode:token1');
  });
});
