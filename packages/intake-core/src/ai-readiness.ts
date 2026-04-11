/**
 * AI Readiness score (0–100) — weights and strings from `ai-readiness.v1.json` (docs/QUESTION_BANK.md §8).
 */
import type { AiReadinessResult, IntakeResponsesMap } from './types.js';
import { getResponseString, unwrapIntakeValue } from './unwrap.js';
import { normalizeWebsiteGate } from './branch-rules.js';
import {
  isA8KnownScale,
  isGovernanceClear,
  normalizeAutomationAttempt,
  normalizeD3ManualLoad,
  normalizeD4aAiUsage,
  normalizeD4bExportReadiness,
} from './answer-normalizers.js';
import readinessCfg from './ai-readiness.v1.json' with { type: 'json' };

const cfg = readinessCfg as {
  baseScore: number;
  exportDataQuick: number;
  exportDataPainfulOrNo: number;
  governanceClear: number;
  d4aBonus: number;
  d2Bonus: number;
  automationAttemptHelped: number;
  penaltyD4aLowWithHighManualLoad: number;
  penaltyVagueTruthWithTeamNotSolo: number;
  scaleBonusA8: number;
  scaleBonusD6MinSelections: number;
  scaleBonusD6: number;
  scaleBonusNoWebsiteGreenfield: number;
  vagueTruthSubstrings: string[];
  d2CatchAllOption: string;
  d2ArticulatedMinLength: number;
};

function manualLoadHigh(responses: IntakeResponsesMap): boolean {
  return normalizeD3ManualLoad(responses) === 'high';
}

function vagueTruthSource(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd4').toLowerCase();
  if (!s) return false;
  return cfg.vagueTruthSubstrings.some(sub => s.includes(sub));
}

function teamNotSolo(responses: IntakeResponsesMap): boolean {
  const raw = unwrapIntakeValue(responses.a4);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  return !s.includes('just me') && s !== 'just_me' && s !== 'solo';
}

function automationAttemptHelpedSignal(responses: IntakeResponsesMap): boolean {
  return normalizeAutomationAttempt(responses) === 'helped';
}

function aiToolsInUse(responses: IntakeResponsesMap): boolean {
  const usage = normalizeD4aAiUsage(responses);
  return usage === 'daily' || usage === 'weekly_or_occasional';
}

function d2IsArticulated(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd2').trim();
  if (!s) return false;
  if (s.length >= cfg.d2ArticulatedMinLength) return true;
  return s !== cfg.d2CatchAllOption;
}

export function calcAiReadinessScore(responses: IntakeResponsesMap): AiReadinessResult {
  const base = cfg.baseScore;
  let exportData = 0;
  let governance = 0;
  let automationAttempt = 0;
  let d4aBonus = 0;
  let d2Bonus = 0;
  let penalties = 0;
  let scaleBonus = 0;

  const exportReadiness = normalizeD4bExportReadiness(responses);
  if (exportReadiness === 'quick') {
    exportData = cfg.exportDataQuick;
  } else if (exportReadiness === 'painful' || exportReadiness === 'no') {
    exportData = cfg.exportDataPainfulOrNo;
  }

  if (isGovernanceClear(responses)) {
    governance = cfg.governanceClear;
  }

  if (aiToolsInUse(responses)) {
    d4aBonus = cfg.d4aBonus;
  }

  if (d2IsArticulated(responses)) {
    d2Bonus = cfg.d2Bonus;
  }

  if (normalizeD4aAiUsage(responses) === 'low' && manualLoadHigh(responses)) {
    penalties += cfg.penaltyD4aLowWithHighManualLoad;
  }
  if (vagueTruthSource(responses) && teamNotSolo(responses)) {
    penalties += cfg.penaltyVagueTruthWithTeamNotSolo;
  }

  if (automationAttemptHelpedSignal(responses)) {
    automationAttempt = cfg.automationAttemptHelped;
  }

  if (isA8KnownScale(responses)) {
    scaleBonus += cfg.scaleBonusA8;
  }
  const rawD6 = unwrapIntakeValue(responses.d6);
  if (
    Array.isArray(rawD6)
      ? rawD6.length >= cfg.scaleBonusD6MinSelections
      : getResponseString(responses, 'd6').length > 0
  ) {
    scaleBonus += cfg.scaleBonusD6;
  }

  const gate = normalizeWebsiteGate(responses);
  if (gate === 'no_website' || gate === 'under_construction') {
    scaleBonus += cfg.scaleBonusNoWebsiteGreenfield;
  }

  const raw = base + exportData + governance + automationAttempt + d4aBonus + d2Bonus + penalties + scaleBonus;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    score,
    components: {
      base,
      exportData,
      governance,
      automationAttempt,
      d4aBonus,
      d2Bonus,
      penalties,
      scaleBonus,
    },
  };
}
