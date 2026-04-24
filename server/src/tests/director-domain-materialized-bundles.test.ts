import { describe, expect, it } from 'vitest';
import { buildCaoMaterializedWaveBundle, buildCdoMaterializedWaveBundle, buildCsoMaterializedWaveBundle } from '../services/orchestration/director-domain-materialized-bundles.service.js';
import { routeCaoDeepDive } from '../services/orchestration/director-cao-router.service.js';
import { routeCdoDeepDiveCase } from '../services/orchestration/director-cdo-router.service.js';
import { routeCsoDeepDiveCase } from '../services/orchestration/director-cso-router.service.js';
import { DirectorWaveBundleSchema } from '../schemas/glc-director-orchestration-slice.js';

describe('director domain materialized bundles', () => {
  it('validates CDO wave bundle (3 actions, dependency chain)', () => {
    const cdoCase = routeCdoDeepDiveCase({
      goals: ['Launch MVP in Q2'],
      constraints: ['Small team'],
    });
    const bundle = buildCdoMaterializedWaveBundle({
      domainKey: 'ux_conversion',
      goals: ['Launch MVP in Q2'],
      constraints: ['Small team'],
      cdoCase,
    });
    expect(DirectorWaveBundleSchema.safeParse(bundle).success).toBe(true);
    expect(bundle.actions).toHaveLength(3);
    expect(bundle.actions[0].id).toContain('sub_agent:cdo.funnel_architect:');
  });

  it('validates CAO wave from router', () => {
    const route = routeCaoDeepDive({ goals: ['Scale ops'], constraints: ['SLA 99.9%'] });
    const bundle = buildCaoMaterializedWaveBundle({
      domainKey: 'automation_processes',
      goals: ['Scale ops'],
      constraints: ['SLA 99.9%'],
      route,
    });
    expect(DirectorWaveBundleSchema.safeParse(bundle).success).toBe(true);
    expect(bundle.actions).toHaveLength(3);
  });

  it('validates CSO wave for incident case', () => {
    const csoCase = routeCsoDeepDiveCase({
      goals: ['incident response'],
      constraints: [],
    });
    const bundle = buildCsoMaterializedWaveBundle({
      domainKey: 'security_compliance',
      goals: ['incident response'],
      constraints: [],
      csoCase,
    });
    expect(DirectorWaveBundleSchema.safeParse(bundle).success).toBe(true);
    expect(bundle.actions[0].id).toContain('cso.case_classifier:');
  });
});
