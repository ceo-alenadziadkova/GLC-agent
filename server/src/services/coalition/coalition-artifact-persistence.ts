import type { DomainKey } from '@glc/intake-core';

import type {
  ClientSituationSnapshot,
  CrossDomainConflictResolution,
  DomainAlignmentResponse,
  DomainHypothesisDraft,
} from '../../schemas/director-collaboration/index.js';
import { supabase } from '../supabase.js';

export async function persistClientSituationSnapshot(snapshot: ClientSituationSnapshot): Promise<void> {
  const { error } = await supabase
    .from('audit_client_situation')
    .upsert(
      {
        audit_id: snapshot.audit_id,
        schema_version: snapshot.schema_version,
        snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'audit_id' },
    );
  if (error) throw error;
}

export async function persistDomainHypothesisDraft(draft: DomainHypothesisDraft): Promise<void> {
  const { error } = await supabase
    .from('audit_domain_hypotheses')
    .upsert(
      {
        audit_id: draft.audit_id,
        domain_key: draft.domain_key as DomainKey,
        schema_version: draft.schema_version,
        draft,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'audit_id,domain_key' },
    );
  if (error) throw error;
}

export async function persistDomainAlignmentResponse(alignment: DomainAlignmentResponse): Promise<void> {
  const { error } = await supabase
    .from('audit_domain_alignments')
    .upsert(
      {
        audit_id: alignment.audit_id,
        domain_key: alignment.domain_key as DomainKey,
        schema_version: alignment.schema_version,
        alignment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'audit_id,domain_key' },
    );
  if (error) throw error;
}

export async function persistConflictResolution(resolution: CrossDomainConflictResolution): Promise<void> {
  const { error } = await supabase
    .from('audit_conflict_resolutions')
    .upsert(
      {
        audit_id: resolution.audit_id,
        schema_version: resolution.schema_version,
        resolution,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'audit_id' },
    );
  if (error) throw error;
}

