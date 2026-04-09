/**
 * AI Readiness score (0–100) — docs/QUESTION_BANK.md §8 (heuristic v1 until bank JSON encodes option values).
 *
 * Components:
 *   base (45)         — starting point
 *   exportData        — d4b: data-export ease (+18 positive / -5 negative)
 *   governance        — f7: clear approval path (+17, 0 if "Not sure")
 *   automationAttempt — d_automation_attempt: prior attempt helped (+10)
 *   d4aBonus          — d4a: client already uses AI tools daily/occasionally (+8)
 *   d2Bonus           — d2: client can articulate their main manual bottleneck (+5)
 *   penalties         — d4a=No + high d3 (-18); vague truth-source + non-solo (-12)
 *   scaleBonus        — a8 answered (+5); d6 answered with 3+ types (+5);
 *                       no_website / under_construction (+5, greenfield bonus — see §8)
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

/** Returns true when client already uses AI tools day-to-day (d4a signal). */
function aiToolsInUse(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd4a').toLowerCase();
  if (!s) return false;
  return s.includes('daily') || s.includes('occasionally') || s.includes('yes');
}

/**
 * Returns true when d2 contains a substantive description of the manual bottleneck
 * (at least 20 chars of non-trivial content). An articulated pain point signals that
 * automation scope is well-understood, raising practical readiness.
 */
function d2IsArticulated(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'd2').trim();
  return s.length >= 20;
}

/**
 * f7 governance is considered "clear" when the client has named a decision-maker
 * other than or including themselves, but explicitly NOT "Not sure" / blank.
 */
function governanceClear(responses: IntakeResponsesMap): boolean {
  const s = getResponseString(responses, 'f7').trim().toLowerCase();
  if (!s) return false;
  return !s.includes('not sure') && !s.includes("don't know") && !s.includes('unsure');
}

export function calcAiReadinessScore(responses: IntakeResponsesMap): AiReadinessResult {
  const base = 45;
  let exportData = 0;
  let governance = 0;
  let automationAttempt = 0;
  let d4aBonus = 0;
  let d2Bonus = 0;
  let penalties = 0;
  let scaleBonus = 0;

  // d4b: data-export capability
  if (boolishPositive(responses.d4b)) {
    exportData = 18;
  } else if (boolishNegative(responses.d4b)) {
    exportData = -5;
  }

  // f7: governance / approval path is clear
  if (governanceClear(responses)) {
    governance = 17;
  }

  // d4a: client already uses AI tools — lowers adoption barrier
  if (aiToolsInUse(responses)) {
    d4aBonus = 8;
  }

  // d2: client can articulate their main manual bottleneck
  if (d2IsArticulated(responses)) {
    d2Bonus = 5;
  }

  // penalties
  if (boolishNegative(responses.d4a) && manualLoadHigh(responses)) {
    penalties -= 18;
  }
  if (vagueTruthSource(responses) && teamNotSolo(responses)) {
    penalties -= 12;
  }

  // automation attempt helped
  if (automationAttemptHelped(responses)) {
    automationAttempt = 10;
  }

  // scale signals
  const a8 = getResponseString(responses, 'a8');
  if (a8.length > 0 && !a8.toLowerCase().includes('not sure')) {
    scaleBonus += 5;
  }
  const d6 = getResponseString(responses, 'd6');
  if (d6.length > 2) {
    scaleBonus += 5;
  }

  // No-website / under-construction: client has no legacy web-tech debt and the
  // entire audit scope shifts to process automation — a greenfield advantage.
  // Modest bonus reflects lower adoption barriers for new tooling. (docs §8)
  const gate = normalizeWebsiteGate(responses);
  if (gate === 'no_website' || gate === 'under_construction') {
    scaleBonus += 5;
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
