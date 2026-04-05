import { afterEach, describe, expect, it } from 'vitest';
import {
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
  CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY,
  CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE,
  applyClientBriefLayoutAskEachTime,
  applyConsultantBriefLayoutAskEachTime,
  clientBriefLayoutStorageKey,
  consultantBriefLayoutStorageKey,
  resolveClientBriefLayout,
  resolveConsultantBriefLayout,
  writeClientBriefLayout,
  writeClientBriefLayoutDefault,
  writeConsultantBriefLayout,
  writeConsultantBriefLayoutDefault,
} from './client-brief-layout-preference';

describe('client-brief-layout-preference', () => {
  afterEach(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
    }
  });

  it('resolveConsultantBriefLayout prefers per-scope over default', () => {
    writeConsultantBriefLayoutDefault('wizard');
    writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, 'classic');
    expect(resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)).toBe('classic');
  });

  it('writeConsultantBriefLayoutDefault removes new_audit scope', () => {
    writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, 'wizard');
    writeConsultantBriefLayoutDefault('classic');
    expect(localStorage.getItem(consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE))).toBeNull();
    expect(resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)).toBe('classic');
  });

  it('applyConsultantBriefLayoutAskEachTime clears default and all consultant scope keys', () => {
    writeConsultantBriefLayoutDefault('classic');
    writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, 'wizard');
    writeConsultantBriefLayout('audit-uuid-1', 'classic');
    applyConsultantBriefLayoutAskEachTime();
    expect(localStorage.getItem(CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY)).toBeNull();
    expect(localStorage.getItem(consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE))).toBeNull();
    expect(localStorage.getItem(consultantBriefLayoutStorageKey('audit-uuid-1'))).toBeNull();
    expect(resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)).toBeNull();
  });

  it('applyClientBriefLayoutAskEachTime clears default and all client per-audit keys', () => {
    writeClientBriefLayoutDefault('wizard');
    writeClientBriefLayout('audit-a', 'classic');
    applyClientBriefLayoutAskEachTime();
    expect(localStorage.getItem(CLIENT_BRIEF_LAYOUT_DEFAULT_KEY)).toBeNull();
    expect(localStorage.getItem(clientBriefLayoutStorageKey('audit-a'))).toBeNull();
    expect(resolveClientBriefLayout('audit-a')).toBeNull();
  });

  it('does not remove unrelated localStorage keys', () => {
    localStorage.setItem('other_app_key', 'x');
    applyConsultantBriefLayoutAskEachTime();
    expect(localStorage.getItem('other_app_key')).toBe('x');
    const stillHasOther = [...Array(localStorage.length).keys()].some(i => localStorage.key(i) === 'other_app_key');
    expect(stillHasOther).toBe(true);
  });
});
