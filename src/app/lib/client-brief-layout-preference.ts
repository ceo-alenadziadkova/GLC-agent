/** localStorage key: glc_client_brief_layout_v1:<auditId> */
export const CLIENT_BRIEF_LAYOUT_STORAGE_PREFIX = 'glc_client_brief_layout_v1:';

/** Scope id for client self-serve wizard before an audit id exists (same shape as per-audit keys). */
export const CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE = 'new_self_serve';

/** Default when no per-audit override (Settings + first open). */
export const CLIENT_BRIEF_LAYOUT_DEFAULT_KEY = 'glc_client_brief_layout_default_v1';

/** Default for New Audit + workspace when no per-scope override. */
export const CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY = 'glc_consultant_brief_layout_default_v1';

export const BRIEF_LAYOUT_PREFS_CHANGED_EVENT = 'glc-brief-layout-prefs-changed';

export type ClientBriefLayoutStored = 'classic' | 'wizard';

function notifyBriefLayoutPrefsChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(BRIEF_LAYOUT_PREFS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function localStorageKeysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        out.push(k);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function clientBriefLayoutStorageKey(auditId: string): string {
  return `${CLIENT_BRIEF_LAYOUT_STORAGE_PREFIX}${auditId}`;
}

export function readClientBriefLayout(auditId: string): ClientBriefLayoutStored | null {
  try {
    const raw = localStorage.getItem(clientBriefLayoutStorageKey(auditId));
    return raw === 'classic' || raw === 'wizard' ? raw : null;
  } catch {
    return null;
  }
}

export function writeClientBriefLayout(auditId: string, mode: ClientBriefLayoutStored): void {
  try {
    localStorage.setItem(clientBriefLayoutStorageKey(auditId), mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearClientBriefLayout(auditId: string): void {
  try {
    localStorage.removeItem(clientBriefLayoutStorageKey(auditId));
  } catch {
    /* ignore */
  }
}

export function readClientBriefLayoutDefault(): ClientBriefLayoutStored | null {
  try {
    const raw = localStorage.getItem(CLIENT_BRIEF_LAYOUT_DEFAULT_KEY);
    return raw === 'classic' || raw === 'wizard' ? raw : null;
  } catch {
    return null;
  }
}

export function writeClientBriefLayoutDefault(mode: ClientBriefLayoutStored): void {
  try {
    localStorage.setItem(CLIENT_BRIEF_LAYOUT_DEFAULT_KEY, mode);
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

export function clearClientBriefLayoutDefault(): void {
  try {
    localStorage.removeItem(CLIENT_BRIEF_LAYOUT_DEFAULT_KEY);
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

/**
 * Settings "Ask each time": remove default and all per-audit overrides so the chooser shows until the user picks again.
 * Single notify (avoids duplicate sync runs from chained clears).
 */
export function applyClientBriefLayoutAskEachTime(): void {
  try {
    for (const k of localStorageKeysWithPrefix(CLIENT_BRIEF_LAYOUT_STORAGE_PREFIX)) {
      localStorage.removeItem(k);
    }
    localStorage.removeItem(CLIENT_BRIEF_LAYOUT_DEFAULT_KEY);
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

/** Per-audit override wins, then Settings default, else null (show chooser). */
export function resolveClientBriefLayout(auditId: string): ClientBriefLayoutStored | null {
  return readClientBriefLayout(auditId) ?? readClientBriefLayoutDefault();
}

/** Consultant / admin: `new_audit` for New Audit step 1, or audit UUID in workspace. */
export const CONSULTANT_BRIEF_LAYOUT_STORAGE_PREFIX = 'glc_consultant_brief_layout_v1:';
export const CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE = 'new_audit';

export function consultantBriefLayoutStorageKey(scope: string): string {
  return `${CONSULTANT_BRIEF_LAYOUT_STORAGE_PREFIX}${scope}`;
}

export function readConsultantBriefLayout(scope: string): ClientBriefLayoutStored | null {
  try {
    const raw = localStorage.getItem(consultantBriefLayoutStorageKey(scope));
    return raw === 'classic' || raw === 'wizard' ? raw : null;
  } catch {
    return null;
  }
}

export function writeConsultantBriefLayout(scope: string, mode: ClientBriefLayoutStored): void {
  try {
    localStorage.setItem(consultantBriefLayoutStorageKey(scope), mode);
  } catch {
    /* ignore */
  }
}

export function clearConsultantBriefLayout(scope: string): void {
  try {
    localStorage.removeItem(consultantBriefLayoutStorageKey(scope));
  } catch {
    /* ignore */
  }
}

export function readConsultantBriefLayoutDefault(): ClientBriefLayoutStored | null {
  try {
    const raw = localStorage.getItem(CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY);
    return raw === 'classic' || raw === 'wizard' ? raw : null;
  } catch {
    return null;
  }
}

export function writeConsultantBriefLayoutDefault(mode: ClientBriefLayoutStored): void {
  try {
    localStorage.setItem(CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY, mode);
    // Drop New-Audit-only override so the default applies (avoids default + new_audit both set from Settings).
    localStorage.removeItem(consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE));
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

export function clearConsultantBriefLayoutDefault(): void {
  try {
    localStorage.removeItem(CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY);
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

/**
 * Settings "Ask each time": remove default and all per-scope overrides (`new_audit`, each audit id in workspace).
 * Single notify.
 */
export function applyConsultantBriefLayoutAskEachTime(): void {
  try {
    for (const k of localStorageKeysWithPrefix(CONSULTANT_BRIEF_LAYOUT_STORAGE_PREFIX)) {
      localStorage.removeItem(k);
    }
    localStorage.removeItem(CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY);
    notifyBriefLayoutPrefsChanged();
  } catch {
    /* ignore */
  }
}

export function resolveConsultantBriefLayout(scope: string): ClientBriefLayoutStored | null {
  return readConsultantBriefLayout(scope) ?? readConsultantBriefLayoutDefault();
}
