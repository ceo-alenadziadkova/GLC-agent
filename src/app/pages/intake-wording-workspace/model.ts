import { buildIntakePlan } from '@glc/intake-core';
import { bankIdToBriefQuestion } from '../../data/bankQuestionUiCatalog';
import type { IntakeBriefCollectionMode, ProductMode } from '../../data/auditTypes';
import type { IntakeSurface } from '@glc/intake-core';
import type { TraceResult } from './types';

export function buildTraceFromInputs(params: {
  responsesText: string;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | '';
  surface: IntakeSurface | '';
  invalidJsonMessage: string;
  notObjectMessage: string;
}): TraceResult {
  const { responsesText, productMode, collectionMode, surface, invalidJsonMessage, notObjectMessage } =
    params;
  let responses: Record<string, unknown>;
  try {
    responses = JSON.parse(responsesText) as Record<string, unknown>;
    if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) {
      return { ok: false, message: notObjectMessage };
    }
  } catch {
    return { ok: false, message: invalidJsonMessage };
  }
  try {
    const plan = buildIntakePlan({
      responses,
      productMode,
      collectionMode: collectionMode || undefined,
      surface: surface || undefined,
    });
    return { ok: true, plan };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export function collectPlanIds(trace: TraceResult): string[] {
  if (!trace.ok) return [];
  return [
    ...new Set([
      ...trace.plan.eligible,
      ...trace.plan.visible,
      ...trace.plan.required,
      ...trace.plan.hidden,
      ...trace.plan.deferred,
    ]),
  ].sort((a, b) => a.localeCompare(b));
}

export function resolveQuestionLabel(params: {
  id: string;
  drafts: Record<string, string>;
  published: Record<string, string>;
  priorityById: Map<string, 'critical' | 'required' | 'recommended' | 'optional'>;
}): string {
  const { id, drafts, published, priorityById } = params;
  const priority = priorityById.get(id);
  const normalizedPriority = priority === 'critical' ? 'required' : (priority ?? 'recommended');
  const draft = drafts[id]?.trim();
  if (draft) return `${draft} (draft)`;
  const publishedText = published[id]?.trim();
  if (publishedText) return `${publishedText} (published)`;
  return bankIdToBriefQuestion(id, normalizedPriority).question;
}

export function parseWordingImportJson(rawText: string, invalidJsonMessage: string, notObjectMessage: string): {
  ok: true;
  drafts: Record<string, string>;
} | {
  ok: false;
  message: string;
} {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: notObjectMessage };
    }
    const drafts: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') drafts[key] = value;
    }
    return { ok: true, drafts };
  } catch {
    return { ok: false, message: invalidJsonMessage };
  }
}

export function formatPublicationLogTimestamp(isoDate: string): string {
  return `${new Date(isoDate).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}
