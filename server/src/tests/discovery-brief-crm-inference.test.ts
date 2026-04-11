import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_BRIEF_USES_CRM_I18N_KEY_NO,
  DISCOVERY_BRIEF_USES_CRM_I18N_KEY_YES,
  DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO,
  DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES,
  DISCOVERY_BRIEF_USES_CRM_NO,
  DISCOVERY_BRIEF_USES_CRM_YES,
  formatUsesCrmBriefDisplayEn,
  inferDiscoveryUsesCrm,
  normalizeUsesCrmBriefStoredValue,
} from '@glc/intake-core';

describe('inferDiscoveryUsesCrm', () => {
  it('returns yes when d1 lists a CRM tool', () => {
    expect(inferDiscoveryUsesCrm(['CRM'], null)).toBe('yes');
  });

  it('returns yes when d1b free text contains crm needle', () => {
    expect(inferDiscoveryUsesCrm([], 'We use a small CRM')).toBe('yes');
  });

  it('returns no when tools or text exist but no crm signal', () => {
    expect(inferDiscoveryUsesCrm(['Spreadsheets'], 'Excel only')).toBe('no');
  });

  it('returns unknown when d1 empty and d1b missing', () => {
    expect(inferDiscoveryUsesCrm([], null)).toBe('unknown');
    expect(inferDiscoveryUsesCrm([], undefined)).toBe('unknown');
  });
});

describe('discovery brief uses_crm contract', () => {
  it('stores locale-agnostic tokens (not English display words)', () => {
    expect(DISCOVERY_BRIEF_USES_CRM_YES).toBe('uses_crm:yes');
    expect(DISCOVERY_BRIEF_USES_CRM_NO).toBe('uses_crm:no');
  });

  it('exposes English labels and i18n keys for future catalogs', () => {
    expect(DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES).toBe('Yes');
    expect(DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO).toBe('No');
    expect(DISCOVERY_BRIEF_USES_CRM_I18N_KEY_YES).toBe('glc.brief.usesCrm.yes');
    expect(DISCOVERY_BRIEF_USES_CRM_I18N_KEY_NO).toBe('glc.brief.usesCrm.no');
  });

  it('normalizeUsesCrmBriefStoredValue accepts canonical tokens and legacy Yes/No', () => {
    expect(normalizeUsesCrmBriefStoredValue(DISCOVERY_BRIEF_USES_CRM_YES)).toBe('yes');
    expect(normalizeUsesCrmBriefStoredValue(DISCOVERY_BRIEF_USES_CRM_NO)).toBe('no');
    expect(normalizeUsesCrmBriefStoredValue('Yes')).toBe('yes');
    expect(normalizeUsesCrmBriefStoredValue('No')).toBe('no');
    expect(normalizeUsesCrmBriefStoredValue('maybe')).toBe(null);
    expect(normalizeUsesCrmBriefStoredValue(null)).toBe(null);
  });
});

describe('formatUsesCrmBriefDisplayEn', () => {
  it('maps normalized values to English labels', () => {
    expect(formatUsesCrmBriefDisplayEn('yes')).toBe(DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES);
    expect(formatUsesCrmBriefDisplayEn('no')).toBe(DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO);
    expect(formatUsesCrmBriefDisplayEn(null)).toBe('');
  });
});
