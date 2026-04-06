/**
 * AI Readiness score (0–100) — docs/QUESTION_BANK.md §8 (heuristic v1 until bank JSON encodes option values).
 */
import type { AiReadinessResult, IntakeResponsesMap } from './types.js';
import { getResponseString, unwrapIntakeValue } from './unwrap.js';
import { normalizeWebsiteGate } from './branch-rules.js';

function boolishPositive(raw: unknown): boolean {
  const s = String(unwrapIntakeValue(raw) ?? '').trim().toLowerCase();
  if (!s) return false;
  if (s === 'yes' || s === 'true') return true;
  if (s.includes('yes') && !s.includes('no')) return true;
  if (s.includes('structured') || s.includes('export') || s.includes('api')) return true;
  return false;
}

function boolishNegative(raw: unknown): boolean {
  const s = String(unwrapIntakeValue(raw) ?? '').trim().toLowerCase();
  if (!s) return false;
  return s === 'no' || s.startsWith('no ') || s.includes('not yet') || s.includes('none');
}

/** Rough manual-load tiers from d3 (free text or select — heuristic). */
function manualLoadHigh(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd3').toLowerCase();
  if (!s) return false;
  return (
    s.includes('80') ||
    s.includes('most') ||
    s.includes('majority') ||
    s.includes('almost all') ||
    s.includes('high')
  );
}

function vagueTruthSource(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd4').toLowerCase();
  if (!s) return false;
  return (
    s.includes('whatsapp') ||
    s.includes('verbally') ||
    s.includes('in person') ||
    s.includes('only in') ||
    s.includes('heads')
  );
}

function teamNotSolo(responses: IntakeResponsesMap): boolean {
  const raw = unwrapIntakeValue(responses.a4);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  return !s.includes('just me') && s !== 'just_me' && s !== 'solo';
}

function automationAttemptHelped(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd_automation_attempt').toLowerCase();
  return s.includes('helped') || s.includes('yes') || s.includes('worked');
}

export function calcAiReadinessScore(responses: IntakeResponsesMap): AiReadinessResult {
  let base = 45;
  let exportData = 0;
  let governance = 0;
  let automationAttempt = 0;
  let penalties = 0;
  let scaleBonus = 0;

  const gate = normalizeWebsiteGate(responses);

  if (boolishPositive(responses.d4b)) {
    exportData = 18;
  } else if (boolishNegative(responses.d4b)) {
    exportData = -5;
  }

  const f7 = getResponseString(responses, 'f7');
  if (f7.length > 1) {
    governance = 17;
  }

  if (boolishNegative(responses.d4a) && manualLoadHigh(responses)) {
    penalties -= 18;
  }

  if (vagueTruthSource(responses) && teamNotSolo(responses)) {
    penalties -= 12;
  }

  if (automationAttemptHelped(responses)) {
    automationAttempt = 10;
  }

  const a8 = getResponseString(responses, 'a8');
  if (a8.length > 0 && !a8.toLowerCase().includes('not sure')) {
    scaleBonus += 5;
  }

  const d6 = getResponseString(responses, 'd6');
  if (d6.length > 2) {
    scaleBonus += 5;
  }

  if (gate === 'no_website' || gate === 'under_construction') {
    base += 5;
  }

  const raw = base + exportData + governance + automationAttempt + penalties + scaleBonus;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    score,
    components: {
      base,
      exportData,
      governance,
      automationAttempt,
      penalties,
      scaleBonus,
    },
  };
}
