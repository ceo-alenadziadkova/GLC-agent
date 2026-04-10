import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('migration 039 RLS hardening', () => {
  const migration = readFileSync(
    resolve(import.meta.dirname, '../../migrations/039_pipeline_runs_and_rls_hardening.sql'),
    'utf-8',
  );

  it('enables RLS on operational tables', () => {
    const mustEnable = [
      'ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE snapshot_guest_sessions ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE snapshot_domain_cache ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE snapshot_domain_cooldown ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE intake_analytics_events ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE phase_runs ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;',
    ];
    for (const line of mustEnable) {
      expect(migration).toContain(line);
    }
  });

  it('creates deny-all policies for client roles', () => {
    const mustContain = [
      'CREATE POLICY intake_tokens_deny_client_access',
      'CREATE POLICY snapshot_guest_sessions_deny_client_access',
      'CREATE POLICY snapshot_domain_cache_deny_client_access',
      'CREATE POLICY snapshot_domain_cooldown_deny_client_access',
      'CREATE POLICY intake_analytics_events_deny_client_access',
      'CREATE POLICY phase_runs_deny_client_access',
      'CREATE POLICY job_runs_deny_client_access',
    ];
    for (const token of mustContain) {
      expect(migration).toContain(token);
    }
  });
});

