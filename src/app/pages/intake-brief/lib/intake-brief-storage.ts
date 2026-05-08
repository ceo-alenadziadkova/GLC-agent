const INTAKE_PROGRESSIVE_STATE_KEY_PREFIX = 'glc:intake:progressive-state:';
const INTAKE_ENTRY_MODE_KEY_PREFIX = 'glc:intake:entry-mode:';

export function intakeProgressiveStateKey(token: string): string {
  return `${INTAKE_PROGRESSIVE_STATE_KEY_PREFIX}${token}`;
}

export function intakeEntryModeStorageKey(token: string): string {
  return `${INTAKE_ENTRY_MODE_KEY_PREFIX}${token}`;
}

export function readIntakeEntryModeFromStorage(token: string): 'form' | 'dictation' {
  if (typeof window === 'undefined') return 'form';
  try {
    const value = window.localStorage.getItem(intakeEntryModeStorageKey(token));
    return value === 'dictation' ? 'dictation' : 'form';
  } catch {
    return 'form';
  }
}
