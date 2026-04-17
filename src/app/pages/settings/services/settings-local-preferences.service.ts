import type { NotificationPrefs } from '../domain/settings.types';
import type { ClientBriefLayoutStored } from '../../../lib/client-brief-layout-preference';
import {
  applyClientBriefLayoutAskEachTime,
  applyConsultantBriefLayoutAskEachTime,
  BRIEF_LAYOUT_PREFS_CHANGED_EVENT,
  readClientBriefLayoutDefault,
  readConsultantBriefLayoutDefault,
  writeClientBriefLayoutDefault,
  writeConsultantBriefLayoutDefault,
} from '../../../lib/client-brief-layout-preference';
import { NOTIFY_PREFS_LOCAL_STORAGE_ID } from '../../../config/settings-page-defaults';

const NOTIFY_PREFS_FALLBACK: NotificationPrefs = {
  auditStatusReminders: true,
  productUpdates: false,
};

export function readNotifyPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFY_PREFS_LOCAL_STORAGE_ID);
    if (!raw) return NOTIFY_PREFS_FALLBACK;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      auditStatusReminders: parsed.auditStatusReminders ?? NOTIFY_PREFS_FALLBACK.auditStatusReminders,
      productUpdates: parsed.productUpdates ?? NOTIFY_PREFS_FALLBACK.productUpdates,
    };
  } catch {
    return NOTIFY_PREFS_FALLBACK;
  }
}

export function writeNotifyPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(NOTIFY_PREFS_LOCAL_STORAGE_ID, JSON.stringify(prefs));
}

export function readBriefLayoutPrefs(): {
  clientDefault: ClientBriefLayoutStored | null;
  consultantDefault: ClientBriefLayoutStored | null;
} {
  return {
    clientDefault: readClientBriefLayoutDefault(),
    consultantDefault: readConsultantBriefLayoutDefault(),
  };
}

export function setClientBriefLayoutDefault(next: ClientBriefLayoutStored | null): void {
  if (next === null) {
    applyClientBriefLayoutAskEachTime();
    return;
  }
  writeClientBriefLayoutDefault(next);
}

export function setConsultantBriefLayoutDefault(next: ClientBriefLayoutStored | null): void {
  if (next === null) {
    applyConsultantBriefLayoutAskEachTime();
    return;
  }
  writeConsultantBriefLayoutDefault(next);
}

export function subscribeBriefLayoutPrefsChanged(listener: () => void): () => void {
  window.addEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, listener);
}
