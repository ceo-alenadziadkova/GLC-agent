import {
  choiceValueNeedsSpecify,
  getPreBriefSubmitSlotIds as resolveSharedPreBriefSubmitSlotIds,
  isPreBriefSubmitSlotSatisfied,
  resolveFullSlaRequiredIds,
} from '@glc/intake-core';
import {
  BRIEF_QUESTIONS as SERVER_BRIEF_QUESTIONS,
  INTAKE_IDENTITY_BRIEF_QUESTIONS as SERVER_INTAKE_IDENTITY_BRIEF_QUESTIONS,
  EXPRESS_REQUIRED_QUESTION_IDS as SERVER_EXPRESS_REQUIRED_QUESTION_IDS,
  getBriefQuestionText as serverGetBriefQuestionText,
  PRE_BRIEF_QUESTION_IDS as SERVER_PRE_BRIEF_QUESTION_IDS,
  REQUIRED_QUESTION_IDS as SERVER_REQUIRED_QUESTION_IDS,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode } from './audit/contracts/intake/intake-brief.types';
import { briefResponsesToIntakeMap } from './intakeBriefMap';

/**
 * Legacy / public brief UI — **question rows** from `@glc/intake-core` (`intake-brief-catalog-meta`, no Zod).
 * This module adds SPA-only helpers and re-exports the same arrays
 * with the local `BriefQuestion` view type (server rows may include `domains`).
 *
 * Question-bank v1 (wizard) stays in `bankQuestionUiCatalog.ts` + `question-bank.v1.json`.
 *
 * Priority:
 *   required     — pipeline blocked until all answered
 *   recommended  — agents flag data gaps but proceed
 *   optional     — nice-to-have context
 */
export type BriefPriority = 'required' | 'recommended' | 'optional';
export type BriefQuestionType = 'free_text' | 'single_choice' | 'multi_choice' | 'number' | 'rating' | 'confirm';
export type BriefImportance = 'red' | 'yellow' | 'green';
export type IntakeLayer = 0 | 1 | 2 | 3 | 'pre_brief';
export type UxGroup = 'basics' | 'business' | 'tech' | 'audience' | 'goals';
export type BriefResponseValue = string | string[] | number | boolean | null;
export type BriefRevenueSignal = 'high' | 'medium' | 'low';

export interface BriefQuestion {
  id: string;
  priority: BriefPriority;
  importance?: BriefImportance;
  intake_layer?: IntakeLayer;
  weight?: number;
  ux_group?: UxGroup;
  section?: string;
  question: string;
  hint?: string;
  consultant_hint?: string;
  revenue_signal?: BriefRevenueSignal;
  triggers_followup?: string[];
  type: BriefQuestionType;
  options?: string[];
}

export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
}

export type BriefResponses = Record<string, BriefResponseValue | BriefResponseEntry>;

export const BRIEF_QUESTIONS = SERVER_BRIEF_QUESTIONS as BriefQuestion[];

export const INTAKE_IDENTITY_BRIEF_QUESTIONS = SERVER_INTAKE_IDENTITY_BRIEF_QUESTIONS as BriefQuestion[];

export function getBriefQuestionText(id: string): string {
  return serverGetBriefQuestionText(id);
}

export const REQUIRED_IDS = SERVER_REQUIRED_QUESTION_IDS;

/** Express SLA base ids for pipeline gates; pre-brief link uses `resolvePreBriefSubmitExpressBankIds` (intersect `bankIncluded`). */
export const EXPRESS_REQUIRED_QUESTION_IDS = SERVER_EXPRESS_REQUIRED_QUESTION_IDS;

/**
 * IDs checked before pipeline start — matches server `evaluateBriefGates` for paid audits.
 * Intake SLA is always full; `mode` is kept for call-site compatibility only.
 */
export function pipelineRequiredIdsForProductMode(
  _mode: 'full' | 'express',
  responses: BriefResponses,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  void _mode;
  const m = briefResponsesToIntakeMap(responses);
  return [...resolveFullSlaRequiredIds(m, collectionMode)];
}

export const PRE_BRIEF_QUESTION_IDS = SERVER_PRE_BRIEF_QUESTION_IDS;

export const BRIEF_SECTIONS = [...new Set(BRIEF_QUESTIONS.map(q => q.section).filter(Boolean) as string[])];
export const BRIEF_UX_GROUPS = [...new Set(BRIEF_QUESTIONS.map(q => q.ux_group))];

/** Adjacent questions with the same `section` become one block (public `/intake`, review step). */
export function groupBriefQuestionsBySection(
  ordered: BriefQuestion[],
): Array<{ section: string; questions: BriefQuestion[] }> {
  const groups: Array<{ section: string; questions: BriefQuestion[] }> = [];
  for (const q of ordered) {
    const section = (q.section?.trim() || 'Questions').trim();
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.questions.push(q);
    } else {
      groups.push({ section, questions: [q] });
    }
  }
  return groups;
}

export function unwrapResponse(value: BriefResponseValue | BriefResponseEntry | undefined): BriefResponseValue | undefined {
  if (value != null && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return value.value;
  }
  return value as BriefResponseValue | undefined;
}

/** Trimmed string from a brief response cell (public intake, “other specify” fields). */
export function briefResponseTrimmedString(raw: BriefResponses[string] | undefined): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    const v = (raw as BriefResponseEntry).value;
    return typeof v === 'string' ? v.trim() : '';
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

/** True if the field has no usable answer yet (used to apply consultant metadata prefill on public intake). */
export function isBriefValueBlank(raw: BriefResponses[string] | undefined): boolean {
  if (raw === undefined) return true;
  if (isExplicitUnknown(raw)) return false;
  const v = unwrapResponse(raw);
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return false;
  if (typeof v === 'boolean') return false;
  if (Array.isArray(v)) return v.length === 0;
  return true;
}

/**
 * Deep-enough merge for saving intake brief: non-blank local answers win; otherwise keep server.
 * Prevents wiping token-merged pre-brief when local React state missed some keys (e.g. expired public GET).
 */
export function mergeBriefResponsesPreferFilled(
  server: BriefResponses,
  local: BriefResponses,
): BriefResponses {
  const keys = new Set([...Object.keys(server), ...Object.keys(local)]);
  const out: BriefResponses = {};
  for (const id of keys) {
    const s = server[id];
    const l = local[id];
    const sOk = !isBriefValueBlank(s);
    const lOk = !isBriefValueBlank(l);
    if (lOk) {
      out[id] = l as BriefResponseEntry;
    } else if (sOk) {
      out[id] = s as BriefResponseEntry;
    } else if (l !== undefined) {
      out[id] = l as BriefResponseEntry;
    } else if (s !== undefined) {
      out[id] = s as BriefResponseEntry;
    }
  }
  return out;
}

function isExplicitUnknown(raw: BriefResponses[string] | undefined): boolean {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw) && 'source' in raw) {
    return (raw as BriefResponseEntry).source === 'unknown';
  }
  return false;
}

/** Counts questions satisfied for gating: real answers or explicit "I don't know" (source unknown). */
export function countAnswered(responses: BriefResponses, ids: string[]): number {
  return ids.filter(id => {
    if (isExplicitUnknown(responses[id])) return true;
    const v = unwrapResponse(responses[id]);
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return true;
    if (typeof v === 'boolean') return true;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  }).length;
}

/** True when primary industry is Other (shows follow-up specify field on public pre-brief). */
export function intakeIndustryIsOther(responses: BriefResponses): boolean {
  const v = unwrapResponse(responses.a2 ?? responses.intake_industry);
  return v === 'Other';
}

/** Canonical `a5` label when the business has no public site (question-bank + UI overrides). */
export const WEBSITE_PRESENCE_NO_SITE_LABEL = 'No website yet' as const;

/** Stored in `a11` when `a5` is {@link WEBSITE_PRESENCE_NO_SITE_LABEL} (aligned with consultant Step 0 / `websiteAnswerToAuditUrl`). */
export const A11_VALUE_WHEN_NO_PUBLIC_SITE = 'none' as const;

export function websitePresenceMeansNoPublicSite(responses: BriefResponses): boolean {
  return unwrapResponse(responses.a5) === WEBSITE_PRESENCE_NO_SITE_LABEL;
}

/**
 * When website presence is "no site", ensure `a11` carries the canonical sentinel so submit validation passes.
 * Returns the same reference if no change.
 */
export function coerceA11ForNoWebsitePresence(responses: BriefResponses): BriefResponses {
  if (!websitePresenceMeansNoPublicSite(responses)) return responses;
  const a11v = unwrapResponse(responses.a11);
  const t = typeof a11v === 'string' ? a11v.trim() : '';
  const lower = t.toLowerCase();
  if (lower === 'none') return responses;
  const emptyOrPlaceholder =
    !t || lower === 'no website' || lower === 'n/a' || lower === 'na';
  if (emptyOrPlaceholder) {
    return { ...responses, a11: { value: A11_VALUE_WHEN_NO_PUBLIC_SITE, source: 'client' } };
  }
  return responses;
}

/** Pre-brief completion per slot (industry Other + choice "specify" options). */
export function isPreBriefQuestionSatisfied(questionId: string, responses: BriefResponses): boolean {
  return isPreBriefSubmitSlotSatisfied(questionId, briefResponsesToIntakeMap(responses));
}

/** Slot list for public pre-brief progress + server submit validation (identity + core). */
export function getPreBriefSubmitSlotIds(responses: BriefResponses): string[] {
  return resolveSharedPreBriefSubmitSlotIds(briefResponsesToIntakeMap(responses));
}

export function countPreBriefSatisfied(responses: BriefResponses): number {
  return getPreBriefSubmitSlotIds(responses).filter(id => isPreBriefQuestionSatisfied(id, responses)).length;
}

/** One-line summary for review / read-only lists (intake, exports). */
export function formatBriefAnswerSummary(
  q: BriefQuestion,
  raw: BriefResponses[string] | undefined,
  allResponses?: BriefResponses,
): string {
  if (raw === undefined) return '—';
  if (isExplicitUnknown(raw)) return "Don't know (consultant will follow up)";
  const v = unwrapResponse(raw);
  if (v === null || v === undefined) return '—';
  let line: string;
  if (typeof v === 'string') line = v.trim() || '—';
  else if (typeof v === 'number') line = String(v);
  else if (typeof v === 'boolean') line = v ? 'Yes' : 'No';
  else if (Array.isArray(v)) line = v.length ? v.join(', ') : '—';
  else line = '—';

  if (allResponses && (typeof v === 'string' || Array.isArray(v)) && choiceValueNeedsSpecify(v)) {
    const specKey = q.id === 'a2' ? 'intake_industry_specify' : `${q.id}__other`;
    const spec = unwrapResponse(allResponses[specKey]);
    if (typeof spec === 'string' && spec.trim()) {
      line = `${line} (${spec.trim()})`;
    }
  }
  return line;
}
