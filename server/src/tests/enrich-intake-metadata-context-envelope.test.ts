import { afterEach, describe, expect, it } from 'vitest';

import { enrichIntakeMetadata } from '../services/context-builder/enrich-intake-metadata.js';

const ORIGINAL_ENV = { ...process.env };

describe('enrichIntakeMetadata project context envelope flag', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('omits intake_project_context_envelope when FEATURE_PROJECT_CONTEXT_ENVELOPE is not enabled', () => {
    process.env.FEATURE_PROJECT_CONTEXT_ENVELOPE = 'false';
    const out = enrichIntakeMetadata({
      allResponses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
      },
      brief: null,
      productMode: 'full',
    });
    expect(out.intake_ai_readiness_score).toBeTypeOf('number');
    expect(out.intake_project_context_envelope).toBeUndefined();
  });

  it('includes intake_project_context_envelope when FEATURE_PROJECT_CONTEXT_ENVELOPE is enabled', () => {
    process.env.FEATURE_PROJECT_CONTEXT_ENVELOPE = 'true';
    const out = enrichIntakeMetadata({
      allResponses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
      },
      brief: null,
      productMode: 'full',
    });
    expect(out.intake_project_context_envelope).toBeDefined();
    const envelope = out.intake_project_context_envelope as {
      readinessContext?: { flowReadinessStatus?: string; auditReadinessStatus?: string };
      identityContext?: { industry?: string | null };
    };
    expect(['flow_ready', 'blocked']).toContain(envelope.readinessContext?.flowReadinessStatus);
    expect(['audit_ready', 'blocked', 'ready_with_caveats']).toContain(envelope.readinessContext?.auditReadinessStatus);
    expect(envelope.identityContext?.industry).toBe('Healthcare');
  });
});
