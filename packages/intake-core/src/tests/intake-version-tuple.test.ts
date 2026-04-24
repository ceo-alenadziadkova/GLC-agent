import { describe, expect, it } from 'vitest';

import { parseIntakeVersionsBody, tuplesEqual } from '../core/intake-version-tuple.js';
import { INTAKE_SEQUENCING_VERSION, currentIntakeVersionTuple } from '../core/versions.js';
import { resolveSequencingPilotArtifact } from '../core/resolve-sequencing-artifact.js';

describe('intake version tuple (ADR sequencingVersion)', () => {
  it('parses legacy four-key body as full tuple with default sequencingVersion', () => {
    const r = parseIntakeVersionsBody({
      questionBankVersion: '1.0.0',
      policyVersion: '1.0.0',
      layoutVersion: '1.1.0',
      resolverVersion: '1.0.0',
    });
    expect(r.kind).toBe('full');
    if (r.kind === 'full') {
      expect(r.tuple.sequencingVersion).toBe(INTAKE_SEQUENCING_VERSION);
    }
  });

  it('requires sequencing when any fifth key path is partially sent', () => {
    const r = parseIntakeVersionsBody({
      questionBankVersion: '1.0.0',
      policyVersion: '1.0.0',
      layoutVersion: '1.1.0',
      resolverVersion: '1.0.0',
      sequencingVersion: '',
    });
    expect(r.kind).toBe('incomplete');
  });

  it('tuple equality includes sequencingVersion', () => {
    const a = currentIntakeVersionTuple();
    const b = { ...a };
    expect(tuplesEqual(a, b)).toBe(true);
    expect(tuplesEqual(a, { ...b, sequencingVersion: '0.0.1' })).toBe(false);
  });

  it('sequencingVersion constant stays aligned with resolved sequencing artifact', () => {
    const artifact = resolveSequencingPilotArtifact(INTAKE_SEQUENCING_VERSION);
    expect(artifact).not.toBeNull();
    expect(artifact?.version).toBe(INTAKE_SEQUENCING_VERSION);
    expect(currentIntakeVersionTuple().sequencingVersion).toBe(artifact?.version);
  });
});
