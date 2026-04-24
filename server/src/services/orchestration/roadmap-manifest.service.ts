import type { AuditExecutionPlan } from '../../types/audit.js';
import {
  RoadmapManifestPayloadSchema,
  type RoadmapManifestPayload,
} from '../../schemas/roadmap-manifest.js';
import { supabase } from '../supabase.js';

export class RoadmapManifestMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoadmapManifestMismatchError';
  }
}

export function parseRoadmapManifestPayload(raw: unknown): RoadmapManifestPayload {
  return RoadmapManifestPayloadSchema.parse(raw);
}

/** Same set of domains (order-insensitive). */
export function manifestSelectedDomainsMatchExecutionPlan(
  manifest: RoadmapManifestPayload,
  plan: AuditExecutionPlan,
): boolean {
  const a = new Set(manifest.selected_domains);
  const b = new Set(plan.selected_domains);
  if (a.size !== b.size) return false;
  for (const d of a) {
    if (!b.has(d)) return false;
  }
  return true;
}

export function assertManifestMatchesExecutionPlan(
  manifest: RoadmapManifestPayload,
  plan: AuditExecutionPlan,
): void {
  if (!manifestSelectedDomainsMatchExecutionPlan(manifest, plan)) {
    throw new RoadmapManifestMismatchError(
      'Roadmap manifest selected_domains must match audits.execution_plan.selected_domains (same set).',
    );
  }
}

export async function insertRoadmapManifestSnapshot(args: {
  auditId: string;
  userId: string;
  payload: RoadmapManifestPayload;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('audit_roadmap_manifest_snapshots')
    .insert({
      audit_id: args.auditId,
      created_by_user_id: args.userId,
      payload: args.payload,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Failed to insert roadmap manifest snapshot');
  }
  return { id: data.id };
}

export async function fetchRoadmapManifestSnapshotForAudit(args: {
  auditId: string;
  snapshotId: string;
}): Promise<{ id: string; payload: RoadmapManifestPayload } | null> {
  const { data, error } = await supabase
    .from('audit_roadmap_manifest_snapshots')
    .select('id, payload')
    .eq('audit_id', args.auditId)
    .eq('id', args.snapshotId)
    .maybeSingle();

  if (error || !data) return null;
  const payload = parseRoadmapManifestPayload(data.payload);
  return { id: data.id, payload };
}

export async function fetchLatestRoadmapManifestSnapshotIdForAudit(args: {
  auditId: string;
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('audit_roadmap_manifest_snapshots')
    .select('id')
    .eq('audit_id', args.auditId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return { id: data.id };
}

export type RoadmapManifestSnapshotRow = {
  id: string;
  created_at: string;
  payload: RoadmapManifestPayload;
};

/**
 * Newest-first manifest snapshots for an audit (caller must verify audit access).
 */
export async function listRoadmapManifestSnapshotsForAudit(args: {
  auditId: string;
  limit: number;
}): Promise<{ snapshots: RoadmapManifestSnapshotRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('audit_roadmap_manifest_snapshots')
    .select('id, created_at, payload')
    .eq('audit_id', args.auditId)
    .order('created_at', { ascending: false })
    .limit(args.limit);

  if (error) {
    return { snapshots: [], error: new Error(error.message) };
  }
  const rows = (data ?? []) as Array<{ id: string; created_at: string; payload: unknown }>;
  const snapshots: RoadmapManifestSnapshotRow[] = [];
  for (const row of rows) {
    try {
      snapshots.push({
        id: row.id,
        created_at: row.created_at,
        payload: parseRoadmapManifestPayload(row.payload),
      });
    } catch {
      continue;
    }
  }
  return { snapshots, error: null };
}
