import type { IntakeBriefCollectionMode, IntakeVersionTuple } from '../../types/audit.js';
import { fetchBriefByAuditId, fetchBriefVersionByAuditId } from '../../repositories/audits/audit-brief.repository.js';
import { fetchAuditBriefClonePartiesByIds, fetchAuditForBriefById } from '../../repositories/audits/audits.repository.js';
import { canAccessAudit } from './audits-access.service.js';
import { saveBriefWithValidation } from './audits-brief.service.js';

/** Identity / Basics cells stay tied to this audit URL + company row after cloning process answers from a sibling clinic. */
export const BRIEF_CLONE_PRESERVE_TARGET_RESPONSE_KEYS = [
  'a5',
  'a11',
  'a12',
  'a2',
  'intake_industry_specify',
] as const;

export function mergeBriefResponsesCloneFromSource(
  targetResponses: Record<string, unknown>,
  sourceResponses: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...sourceResponses };
  for (const k of BRIEF_CLONE_PRESERVE_TARGET_RESPONSE_KEYS) {
    if (targetResponses[k] !== undefined && targetResponses[k] !== null) {
      out[k] = targetResponses[k];
    }
  }
  return out;
}

export function auditsLinkedSameForBriefClone(
  a: { id: string; client_id: string | null },
  b: { id: string; client_id: string | null },
): boolean {
  if (a.id === b.id) return false;
  return (a.client_id ?? '') === (b.client_id ?? '');
}

export class BriefCloneError extends Error {
  constructor(
    readonly code:
      | 'AUDITS_NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'CLIENT_MISMATCH'
      | 'SOURCE_EMPTY'
      | 'SAVE_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'BriefCloneError';
  }
}

/**
 * Copies bank `responses` from `source_audit_id` onto the target audit, preserving Basics/identity cells
 * from the target. Requires same consultant/portfolio linkage via matching `client_id` (both null counts as match).
 */
export async function cloneBriefResponsesFromAuditService(args: {
  targetAuditId: string;
  sourceAuditId: string;
  actorUserId: string;
}): Promise<{ brief: unknown; gates: unknown; validation: unknown }> {
  const { data: rows, error: rowErr } = await fetchAuditBriefClonePartiesByIds([
    args.targetAuditId,
    args.sourceAuditId,
  ]);
  if (rowErr) {
    throw new BriefCloneError('SAVE_FAILED', rowErr.message);
  }
  const list = rows ?? [];
  if (list.length !== 2) {
    throw new BriefCloneError('AUDITS_NOT_FOUND', 'audit_not_found');
  }
  const targetAudit = list.find(r => r.id === args.targetAuditId)!;
  const sourceAudit = list.find(r => r.id === args.sourceAuditId)!;

  if (!canAccessAudit(targetAudit, args.actorUserId) || !canAccessAudit(sourceAudit, args.actorUserId)) {
    throw new BriefCloneError('ACCESS_DENIED', 'access_denied');
  }
  if (!auditsLinkedSameForBriefClone(targetAudit, sourceAudit)) {
    throw new BriefCloneError('CLIENT_MISMATCH', 'client_mismatch');
  }

  const [{ data: targetBrief }, { data: sourceBrief }] = await Promise.all([
    fetchBriefByAuditId(args.targetAuditId),
    fetchBriefByAuditId(args.sourceAuditId),
  ]);

  const sourceRaw = sourceBrief?.responses as Record<string, unknown> | undefined;
  if (!sourceRaw || typeof sourceRaw !== 'object') {
    throw new BriefCloneError('SOURCE_EMPTY', 'empty');
  }
  const sourceKeys = Object.keys(sourceRaw).filter(k => !k.startsWith('_'));
  if (sourceKeys.length === 0) {
    throw new BriefCloneError('SOURCE_EMPTY', 'empty');
  }

  const targetRaw = (targetBrief?.responses as Record<string, unknown> | undefined) ?? {};

  const merged = mergeBriefResponsesCloneFromSource(targetRaw, sourceRaw);

  const { data: targetAuditBrief } = await fetchAuditForBriefById(args.targetAuditId);
  if (!targetAuditBrief) {
    throw new BriefCloneError('AUDITS_NOT_FOUND', 'audit_not_found');
  }

  const { data: versionRow } = await fetchBriefVersionByAuditId(args.targetAuditId);

  const cm = targetBrief?.collection_mode as IntakeBriefCollectionMode | undefined;

  const result = await saveBriefWithValidation({
    auditId: args.targetAuditId,
    actorUserId: args.actorUserId,
    audit: targetAuditBrief,
    responses: merged,
    collectionModeRaw: cm ?? 'pre_brief',
    intakeVersionsRaw: targetBrief?.intake_versions,
    storedVersions: (versionRow?.intake_versions as IntakeVersionTuple | null) ?? null,
  });

  return {
    brief: result.brief,
    gates: result.gates,
    validation: result.validation,
  };
}
