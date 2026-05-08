import { createHash } from 'node:crypto';

import { MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT } from '../../config/orchestration-manifest-draft-policy.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import { supabase } from '../supabase.js';

export type ManifestDraftRevisionRow = {
  id: string;
  audit_id: string;
  canonical_node_key: string;
  requested_lane: string | null;
  owner_hint: string | null;
  expected_pack_version_at_enqueue: number;
  updated_at: string;
};

export function digestManifestDraftRevisions(rows: readonly ManifestDraftRevisionRow[]): string {
  const lines = rows
    .map(r => `${r.canonical_node_key}|${r.requested_lane ?? ''}|${r.owner_hint ?? ''}`)
    .sort();
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

export async function listManifestDraftRevisionsForAudit(args: {
  auditId: string;
}): Promise<{ rows: ManifestDraftRevisionRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('audit_roadmap_manifest_draft_revisions')
    .select('id, audit_id, canonical_node_key, requested_lane, owner_hint, expected_pack_version_at_enqueue, updated_at')
    .eq('audit_id', args.auditId)
    .order('canonical_node_key', { ascending: true });

  if (error) {
    return { rows: [], error: new Error(error.message) };
  }
  return { rows: (data ?? []) as ManifestDraftRevisionRow[], error: null };
}

function rowsToNodeExecutionHints(
  rows: readonly ManifestDraftRevisionRow[],
): NonNullable<RoadmapManifestPayload['node_execution_hints']> {
  const out: NonNullable<RoadmapManifestPayload['node_execution_hints']> = {};
  for (const row of rows) {
    const entry: NonNullable<RoadmapManifestPayload['node_execution_hints']>[string] = {};
    if (row.requested_lane != null && row.requested_lane.trim() !== '') {
      entry.lane = row.requested_lane as NonNullable<(typeof entry)['lane']>;
    }
    if (row.owner_hint != null && row.owner_hint.trim() !== '') {
      entry.owner_hint = row.owner_hint.trim();
    }
    out[row.canonical_node_key] = entry;
  }
  return out;
}

export function mergeQueuedDraftRevisionsIntoManifestPayload(args: {
  base: RoadmapManifestPayload;
  draftRows: readonly ManifestDraftRevisionRow[];
}): RoadmapManifestPayload {
  if (args.draftRows.length === 0) return args.base;

  const fromDrafts = rowsToNodeExecutionHints(args.draftRows);
  const mergedHints: NonNullable<RoadmapManifestPayload['node_execution_hints']> = {
    ...(args.base.node_execution_hints ?? {}),
    ...fromDrafts,
  };

  return {
    ...args.base,
    schema_version: 3,
    node_execution_hints: mergedHints,
  };
}

/** Upserts pending draft revision row (lane and/or owner); merges with previous row fields for omitted parts. */
export async function upsertManifestDraftRevision(args: {
  auditId: string;
  userId: string;
  canonical_node_key: string;
  lane?: string;
  owner_hint?: string;
  expected_pack_version: number;
}): Promise<{ ok: true; pending_count: number } | { ok: false; error: Error }> {
  const hasLane = args.lane != null;
  const hasOwner = args.owner_hint != null;

  const { data: prev, error: selErr } = await supabase
    .from('audit_roadmap_manifest_draft_revisions')
    .select('requested_lane, owner_hint')
    .eq('audit_id', args.auditId)
    .eq('canonical_node_key', args.canonical_node_key)
    .maybeSingle();

  if (selErr) {
    return { ok: false, error: new Error(selErr.message) };
  }

  const prevRow = prev as { requested_lane: string | null; owner_hint: string | null } | null;

  const nextLane = hasLane ? args.lane! : (prevRow?.requested_lane ?? null);
  let nextOwner: string | null;
  if (hasOwner) nextOwner = args.owner_hint!;
  else nextOwner = prevRow?.owner_hint ?? null;

  if (
    nextLane == null &&
    (nextOwner == null || nextOwner.trim() === '')
  ) {
    return { ok: false, error: new Error('manifest_draft_revision_empty_after_merge') };
  }

  const isNewKey = !prevRow;
  if (isNewKey) {
    const { count, error: countErr } = await supabase
      .from('audit_roadmap_manifest_draft_revisions')
      .select('id', { count: 'exact', head: true })
      .eq('audit_id', args.auditId);
    if (countErr) {
      return { ok: false, error: new Error(countErr.message) };
    }
    if (typeof count === 'number' && count >= MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT) {
      return { ok: false, error: new Error('manifest_draft_revision_limit_exceeded') };
    }
  }

  const { error: upErr } = await supabase.from('audit_roadmap_manifest_draft_revisions').upsert(
    {
      audit_id: args.auditId,
      canonical_node_key: args.canonical_node_key,
      requested_lane: nextLane,
      owner_hint: nextOwner,
      expected_pack_version_at_enqueue: args.expected_pack_version,
      created_by_user_id: args.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'audit_id,canonical_node_key' },
  );

  if (upErr) {
    return { ok: false, error: new Error(upErr.message) };
  }

  const { count: pendingCount, error: pendingErr } = await supabase
    .from('audit_roadmap_manifest_draft_revisions')
    .select('id', { count: 'exact', head: true })
    .eq('audit_id', args.auditId);

  if (pendingErr) {
    return { ok: false, error: new Error(pendingErr.message) };
  }

  return { ok: true, pending_count: typeof pendingCount === 'number' ? pendingCount : 0 };
}

export async function clearManifestDraftRevisionsForAudit(auditId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('audit_roadmap_manifest_draft_revisions').delete().eq('audit_id', auditId);
  return { error: error ? new Error(error.message) : null };
}
