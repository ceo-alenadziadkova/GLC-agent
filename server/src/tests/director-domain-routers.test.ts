import { describe, expect, it } from 'vitest';
import { routeCdoDeepDiveCase } from '../services/orchestration/director-cdo-router.service.js';
import { routeCaoDeepDive } from '../services/orchestration/director-cao-router.service.js';
import { routeCsoDeepDiveCase } from '../services/orchestration/director-cso-router.service.js';
import { runCdoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-cdo-orchestrator.service.js';

describe('non-CMO director deep-dive routing (stub phase)', () => {
  it('classifies CDO greenfield from goals', () => {
    expect(routeCdoDeepDiveCase({ goals: ['Launch a new product line'], constraints: [] })).toBe('greenfield');
  });

  it('classifies CDO expansion', () => {
    expect(
      routeCdoDeepDiveCase({ goals: ['Expand into a new market next quarter'], constraints: [] }),
    ).toBe('expansion');
  });

  it('defaults CDO to optimization', () => {
    expect(routeCdoDeepDiveCase({ goals: ['Improve conversion rate'], constraints: [] })).toBe('optimization');
  });

  it('selects CAO deep_audit when governance tokens appear', () => {
    const r = routeCaoDeepDive({ goals: ['Reduce SLA breaches'], constraints: [] });
    expect(r.zone_stage).toBe('deep_audit');
    expect(r.zone_focus).toBe('governance');
  });

  it('selects CAO discovery for generic ops', () => {
    const r = routeCaoDeepDive({ goals: ['Faster handoffs between teams'], constraints: [] });
    expect(r.zone_stage).toBe('discovery');
    expect(r.zone_focus).toBe('operations');
  });

  it('classifies CSO incident over regulated', () => {
    expect(
      routeCsoDeepDiveCase({ goals: ['After the breach we need a plan'], constraints: [] }),
    ).toBe('D_incident');
  });

  it('classifies CSO regulated industry', () => {
    expect(routeCsoDeepDiveCase({ goals: ['GDPR readiness review'], constraints: [] })).toBe('B_regulated');
  });

  it('CDO orchestrator returns two stub actions for ux domain', () => {
    const bundle = runCdoDirectorDeepDiveOrchestrator({
      domainKey: 'ux_conversion',
      goals: ['CTA test'],
      constraints: ['Mobile first'],
    });
    expect(bundle.actions.length).toBeGreaterThanOrEqual(1);
  });
});
