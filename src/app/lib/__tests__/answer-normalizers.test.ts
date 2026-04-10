import { describe, expect, it } from 'vitest';
import {
  normalizeD4bExportReadiness,
  normalizeD4aAiUsage,
  normalizeAutomationAttempt,
  normalizeD3ManualLoad,
  normalizePrimaryGoal,
  normalizeStage,
  normalizeTeamSize,
  normalizeOnlinePresence,
  includesCrmTool,
} from '@glc/intake-core';

describe('answer-normalizers', () => {
  it('normalizes d4b export readiness variants', () => {
    expect(normalizeD4bExportReadiness({ d4b: 'Yes, usually quick' })).toBe('quick');
    expect(normalizeD4bExportReadiness({ d4b: "Rarely — it's painful" })).toBe('painful');
    expect(normalizeD4bExportReadiness({ d4b: "Don't know" })).toBe('unknown');
  });

  it('normalizes d4a AI usage variants', () => {
    expect(normalizeD4aAiUsage({ d4a: 'Daily' })).toBe('daily');
    expect(normalizeD4aAiUsage({ d4a: 'Occasionally' })).toBe('weekly_or_occasional');
    expect(normalizeD4aAiUsage({ d4a: 'Not really' })).toBe('low');
  });

  it('normalizes automation attempt and manual load', () => {
    expect(normalizeAutomationAttempt({ d_automation_attempt: 'Yes, it helped' })).toBe('helped');
    expect(normalizeAutomationAttempt({ d_automation_attempt: 'Tried, then abandoned' })).toBe('abandoned');
    expect(normalizeD3ManualLoad({ d3: '20h+' })).toBe('high');
    expect(normalizeD3ManualLoad({ d3: '5–10h' })).toBe('low');
  });

  it('normalizes stage, team, goal buckets', () => {
    expect(normalizeStage('Just getting started')).toBe('launching');
    expect(normalizeTeamSize('Just me')).toBe('solo');
    expect(normalizePrimaryGoal('Not enough new clients')).toBe('more_clients');
    expect(normalizePrimaryGoal('Too much time on admin and operations')).toBe('admin_overload');
  });

  it('normalizes presence and CRM helpers', () => {
    const presence = normalizeOnlinePresence(['Google / search', 'Google Business listing', 'Not really online yet']);
    expect(presence.hasGoogleSearch).toBe(true);
    expect(presence.hasGoogleBusiness).toBe(true);
    expect(presence.hasNotOnline).toBe(true);
    expect(includesCrmTool(['Email', 'CRM', 'Spreadsheets'])).toBe(true);
    expect(includesCrmTool(['Email', 'Spreadsheets'])).toBe(false);
  });
});
