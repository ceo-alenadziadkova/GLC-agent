import { describe, it, expect } from 'vitest';
import {
  collectTransitiveDependents,
  type AuditClaimGraphRowShape,
} from '../lib/audit-claim-graph-bfs.js';
import type { ControlObjectCausalClaimRef } from '../schemas/control-object.js';

describe('collectTransitiveDependents', () => {
  const row = (
    phase_id: string,
    claim_id: number,
    depends_on_refs: ControlObjectCausalClaimRef[],
    status = 'active'
  ): AuditClaimGraphRowShape => ({
    phase_id,
    claim_id,
    depends_on_refs,
    status,
  });

  it('returns empty when seeds empty', () => {
    expect(collectTransitiveDependents([], [])).toEqual([]);
  });

  it('finds direct dependents only', () => {
    const rows: AuditClaimGraphRowShape[] = [
      row('marketing_utp', 1, [{ phase_id: 'security_compliance', claim_id: 2 }]),
      row('seo_digital', 3, [{ phase_id: 'tech_infrastructure', claim_id: 1 }]),
    ];
    const seeds: ControlObjectCausalClaimRef[] = [{ phase_id: 'security_compliance', claim_id: 2 }];
    const out = collectTransitiveDependents(rows, seeds);
    expect(out).toEqual([{ phase_id: 'marketing_utp', claim_id: 1 }]);
  });

  it('walks transitive chain', () => {
    const rows: AuditClaimGraphRowShape[] = [
      row('security_compliance', 1, []),
      row('marketing_utp', 1, [{ phase_id: 'security_compliance', claim_id: 1 }]),
      row('automation_processes', 1, [{ phase_id: 'marketing_utp', claim_id: 1 }]),
    ];
    const seeds: ControlObjectCausalClaimRef[] = [{ phase_id: 'security_compliance', claim_id: 1 }];
    const out = collectTransitiveDependents(rows, seeds);
    expect(out).toHaveLength(2);
    expect(out).toContainEqual({ phase_id: 'marketing_utp', claim_id: 1 });
    expect(out).toContainEqual({ phase_id: 'automation_processes', claim_id: 1 });
  });

  it('skips already invalidated rows as sources but still expands from seeds', () => {
    const rows: AuditClaimGraphRowShape[] = [
      row('marketing_utp', 1, [{ phase_id: 'security_compliance', claim_id: 1 }], 'invalidated'),
    ];
    const seeds: ControlObjectCausalClaimRef[] = [{ phase_id: 'security_compliance', claim_id: 1 }];
    expect(collectTransitiveDependents(rows, seeds)).toEqual([]);
  });
});
