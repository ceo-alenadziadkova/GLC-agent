import { afterEach, describe, expect, it, vi } from 'vitest';

import * as featureFlags from '../config/feature-flags.js';
import { enrichIntakeMetadata } from '../services/context-builder/enrich-intake-metadata.js';

describe('enrichIntakeMetadata project context envelope flag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits intake_project_context_envelope when facade reports project context envelope off', () => {
    vi.spyOn(featureFlags, 'isProjectContextEnvelopeEnabled').mockReturnValue(false);
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

  it('includes intake_project_context_envelope when facade reports project context envelope on', () => {
    vi.spyOn(featureFlags, 'isProjectContextEnvelopeEnabled').mockReturnValue(true);
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
