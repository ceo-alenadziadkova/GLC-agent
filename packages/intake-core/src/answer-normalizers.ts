import type { IntakeResponsesMap } from './types.js';
import { getResponseString } from './unwrap.js';

export type D4bExportReadiness = 'quick' | 'sometimes' | 'painful' | 'no' | 'unknown' | 'other';
export type D4aAiUsage = 'daily' | 'weekly_or_occasional' | 'low' | 'unknown' | 'other';
export type AutomationAttempt = 'helped' | 'abandoned' | 'not_yet' | 'not_sure' | 'other';
export type D3ManualLoad = 'low' | 'medium' | 'high' | 'unknown' | 'other';
export type StageBucket = 'launching' | 'growing' | 'other' | 'unknown';
export type TeamBucket = 'solo' | 'small' | 'other' | 'unknown';
export type GoalBucket = 'more_clients' | 'admin_overload' | 'other' | 'unknown';

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeD4bExportReadiness(responses: IntakeResponsesMap): D4bExportReadiness {
  const s = norm(getResponseString(responses, 'd4b'));
  if (!s) return 'unknown';
  if (s.includes('yes, usually quick') || s.includes('yes easily') || s.includes('quick')) return 'quick';
  if (s.includes('sometimes')) return 'sometimes';
  if (s.includes('painful') || s.includes('rarely')) return 'painful';
  if (s === 'no' || s.startsWith('no ')) return 'no';
  if (s.includes("don't know") || s.includes('not sure')) return 'unknown';
  return 'other';
}

export function normalizeD4aAiUsage(responses: IntakeResponsesMap): D4aAiUsage {
  const s = norm(getResponseString(responses, 'd4a'));
  if (!s) return 'unknown';
  if (s.includes('daily')) return 'daily';
  if (s.includes('weekly') || s.includes('occasionally')) return 'weekly_or_occasional';
  if (s.includes('not really') || s === 'no' || s.startsWith('no ')) return 'low';
  return 'other';
}

export function normalizeAutomationAttempt(responses: IntakeResponsesMap): AutomationAttempt {
  const s = norm(getResponseString(responses, 'd_automation_attempt'));
  if (!s) return 'not_sure';
  if (s.includes('helped') || s.includes('worked')) return 'helped';
  if (s.includes('abandoned')) return 'abandoned';
  if (s.includes('not yet')) return 'not_yet';
  if (s.includes('not sure') || s.includes("don't know")) return 'not_sure';
  return 'other';
}

export function normalizeD3ManualLoad(responses: IntakeResponsesMap): D3ManualLoad {
  const s = norm(getResponseString(responses, 'd3'));
  if (!s) return 'unknown';
  if (s.includes('< 5') || s.includes('5–10') || s.includes('5-10')) return 'low';
  if (s.includes('10–20') || s.includes('10-20')) return 'medium';
  if (s.includes('20h+') || s.includes('20–40') || s.includes('20-40') || s.includes('40h+')) return 'high';
  if (s.includes('not sure') || s.includes('no idea')) return 'unknown';
  return 'other';
}

export function isGovernanceClear(responses: IntakeResponsesMap): boolean {
  const s = norm(getResponseString(responses, 'f7'));
  if (!s) return false;
  return !(s.includes('not sure') || s.includes("don't know") || s.includes('unsure'));
}

export function isA8KnownScale(responses: IntakeResponsesMap): boolean {
  const s = norm(getResponseString(responses, 'a8'));
  if (!s) return false;
  return !(s.includes('not sure') || s.includes("don't know"));
}

export function normalizeStage(value: unknown): StageBucket {
  const s = norm(String(value ?? ''));
  if (!s) return 'unknown';
  if (s.includes('just getting started') || s.includes('launch')) return 'launching';
  if (s.includes('growing fast') || s === 'growing') return 'growing';
  return 'other';
}

export function normalizeTeamSize(value: unknown): TeamBucket {
  const s = norm(String(value ?? ''));
  if (!s) return 'unknown';
  if (s.includes('just me') || s === 'solo') return 'solo';
  if (s.includes('2–5') || s.includes('2-5')) return 'small';
  return 'other';
}

export function normalizeIndustry(value: unknown): string {
  return norm(String(value ?? ''));
}

export function includesCrmTool(values: string[]): boolean {
  return values.some(v => norm(v).includes('crm'));
}

export function normalizeOnlinePresence(values: string[]): {
  hasNotOnline: boolean;
  hasGoogleSearch: boolean;
  hasGoogleBusiness: boolean;
} {
  const n = values.map(v => norm(v));
  return {
    hasNotOnline: n.some(v => v.includes('not really online')),
    hasGoogleSearch: n.some(v => v === 'google search' || v === 'google / search'),
    hasGoogleBusiness: n.some(v => v.includes('google business')),
  };
}

export function normalizePrimaryGoal(value: unknown): GoalBucket {
  const s = norm(String(value ?? ''));
  if (!s) return 'unknown';
  if (s.includes('not enough new clients') || (s.includes('new') && s.includes('client'))) {
    return 'more_clients';
  }
  if (s.includes('too much time on admin') || (s.includes('admin') && s.includes('operations'))) {
    return 'admin_overload';
  }
  return 'other';
}
