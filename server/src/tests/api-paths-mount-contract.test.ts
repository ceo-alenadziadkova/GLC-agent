import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as ApiPaths from '@glc/web-app/api-paths';

function spaPathUnderExpressMounts(spaPath: string, prefixes: readonly string[]): boolean {
  const pathOnly = spaPath.split('?')[0];
  return prefixes.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`));
}

let expressApiMountPrefixesUnique: () => string[];

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-role');
  const mod = await import('../config/api-route-mounts.js');
  expressApiMountPrefixesUnique = mod.expressApiMountPrefixesUnique;
});

describe('SPA API_PATHS vs Express mount prefixes', () => {
  it('every static API_PATHS value is mounted on the server', () => {
    const prefixes = expressApiMountPrefixesUnique();
    const staticValues = Object.values(ApiPaths.API_PATHS).filter((v) => typeof v === 'string') as string[];
    for (const p of staticValues) {
      expect(spaPathUnderExpressMounts(p, prefixes), `unmounted SPA path: ${p}`).toBe(true);
    }
  });

  it('builder helpers produce paths under a mount prefix', () => {
    const prefixes = expressApiMountPrefixesUnique();
    const samples = [
      ApiPaths.apiAuditsPath('audit-id'),
      ApiPaths.apiAuditsPipelineStart('audit-id'),
      ApiPaths.apiAuditsPipelineNext('audit-id'),
      ApiPaths.apiAuditsPipelineRetry('audit-id'),
      ApiPaths.apiAuditsPipelineStatus('audit-id'),
      ApiPaths.apiAuditsBriefHelpRequest('audit-id'),
      ApiPaths.apiAuditsReview('audit-id', 1),
      ApiPaths.apiAuditsQualityGate('audit-id', 2),
      ApiPaths.apiAuditsReportQuery('audit-id', 'pdf', 'default'),
      ApiPaths.apiIntakePrefill('tok'),
      ApiPaths.apiIntakeToken('tok'),
      ApiPaths.apiIntakeRespond('tok'),
      ApiPaths.apiIntakeTracePublicationLog(25),
      ApiPaths.apiBenchmarksQuery({ phase_id: 'tech_infrastructure', industry: 'saas', period: 'last_90d' }),
    ];
    for (const p of samples) {
      expect(spaPathUnderExpressMounts(p, prefixes), `unmounted builder path: ${p}`).toBe(true);
    }
  });
});
