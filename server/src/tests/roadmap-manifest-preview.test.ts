import { describe, expect, it } from 'vitest';

import { buildRoadmapManifestPreview } from '../services/orchestration/roadmap-manifest-preview.js';
import type { AuditExecutionPlan } from '../types/audit.js';
import type { RoadmapManifestPayload } from '../schemas/roadmap-manifest.js';

function plan(partial: Partial<AuditExecutionPlan> & Pick<AuditExecutionPlan, 'selected_domains'>): AuditExecutionPlan {
  return {
    depth: 'standard',
    source: 'user_selected',
    include_strategy: true,
    ...partial,
  };
}

function manifest(payload: Partial<RoadmapManifestPayload> & Pick<RoadmapManifestPayload, 'selected_domains'>): RoadmapManifestPayload {
  return {
    schema_version: 2,
    change_scenario: 'hybrid',
    season_preset: 'rolling_90d',
    ...payload,
  };
}

describe('buildRoadmapManifestPreview', () => {
  it('includes lanes for selected domains and cuts the rest', () => {
    const preview = buildRoadmapManifestPreview({
      manifest: manifest({
        selected_domains: ['marketing_utp', 'tech_infrastructure'],
      }),
      executionPlan: plan({
        selected_domains: ['marketing_utp', 'tech_infrastructure'],
      }),
    });
    expect(preview.lanes_included.sort()).toEqual(['marketing_narrative', 'tech_delivery'].sort());
    expect(preview.lanes_cut.sort()).toEqual(
      ['gtm_sales', 'processes_automation', 'product_change', 'research', 'risk_compliance', 'seo'].sort(),
    );
  });

  it('orders waiting list with recommended domains first', () => {
    const preview = buildRoadmapManifestPreview({
      manifest: manifest({ selected_domains: ['seo_digital'] }),
      executionPlan: plan({
        selected_domains: ['seo_digital'],
        recommended_domains: ['ux_conversion', 'marketing_utp'],
      }),
    });
    expect(preview.waiting_list_domains[0]).toBe('ux_conversion');
    expect(preview.waiting_list_domains[1]).toBe('marketing_utp');
  });

  it('emits a callout for single-domain coverage', () => {
    const preview = buildRoadmapManifestPreview({
      manifest: manifest({ selected_domains: ['seo_digital'] }),
      executionPlan: plan({ selected_domains: ['seo_digital'] }),
    });
    expect(preview.confidence_callouts.some(c => c.includes('Single-domain'))).toBe(true);
  });

  it('maps scenario switch to deterministic compression hints', () => {
    const selected_domains: AuditExecutionPlan['selected_domains'] = ['seo_digital', 'marketing_utp'];
    const executionPlan = plan({ selected_domains });
    const integrate = buildRoadmapManifestPreview({
      manifest: manifest({ selected_domains, change_scenario: 'integrate_existing' }),
      executionPlan,
    });
    const buildNew = buildRoadmapManifestPreview({
      manifest: manifest({ selected_domains, change_scenario: 'build_new' }),
      executionPlan,
    });
    const hybrid = buildRoadmapManifestPreview({
      manifest: manifest({ selected_domains, change_scenario: 'hybrid' }),
      executionPlan,
    });
    expect(integrate.execution_compression_hint).toBe('mild');
    expect(buildNew.execution_compression_hint).toBe('moderate');
    expect(hybrid.execution_compression_hint).toBe('moderate');
  });
});
