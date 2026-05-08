import { describe, expect, it } from 'vitest';
import {
  buildNewAuditBriefSavePayload,
  buildResetIntelligenceSnapshotState,
  normalizeServerBriefResponsesForWizard,
} from './new-audit-brief-state';

describe('new-audit-brief-state', () => {
  it('normalizes server brief responses with provided source', () => {
    const out = normalizeServerBriefResponsesForWizard(
      { responses: { a12: 'Acme', a2: 'Other', intake_industry_specify: 'Aerospace' } },
      'consultant',
    );
    expect(out.a12).toEqual({ value: 'Acme', source: 'consultant' });
    expect(out.a2).toEqual({ value: 'Other', source: 'consultant' });
    expect(out.intake_industry_specify).toEqual({ value: 'Aerospace', source: 'consultant' });
  });

  it('builds brief save payload and removes stale industry specify', () => {
    const out = buildNewAuditBriefSavePayload({
      isClientSelfServe: true,
      responses: {
        intake_industry_specify: { value: 'Legacy value', source: 'client' },
      },
      name: 'Acme',
      industry: 'Retail',
      industrySpecify: '',
      url: 'example.com',
      noPublicWebsite: false,
    });
    expect(out.a12).toEqual({ value: 'Acme', source: 'client' });
    expect(out.a11).toEqual({ value: 'https://example.com', source: 'client' });
    expect(out.intake_industry_specify).toBeUndefined();
  });

  it('returns consistent reset state for intelligence snapshot', () => {
    expect(buildResetIntelligenceSnapshotState()).toEqual({
      briefIntelligenceSubStep: 'short_brief',
      intelligenceSnapshotResult: null,
      intelligenceSnapshotError: null,
      intelligenceSnapshotPhase: 'standard',
      intelligenceLlm1Done: false,
    });
  });
});
