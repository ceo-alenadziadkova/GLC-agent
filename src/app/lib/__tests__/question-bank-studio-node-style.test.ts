import { describe, expect, it } from 'vitest';
import {
  resolveStudioPolicyBaseVisual,
  studioPolicyBaseAccent,
} from '../question-bank-studio-node-style';
import type { PolicyOverlay } from '../question-bank-studio-policy';

function ov(partial: Partial<PolicyOverlay> & Pick<PolicyOverlay, 'participates' | 'canonPriority'>): PolicyOverlay {
  return {
    syntheticRequired: false,
    requiredAlways: false,
    requiredIfVisible: false,
    policyRequirednessNone: false,
    ...partial,
  };
}

describe('question-bank-studio-node-style', () => {
  it('marks outside policy when not participating', () => {
    expect(resolveStudioPolicyBaseVisual(ov({ participates: false, canonPriority: 'required' }))).toBe(
      'outside_policy',
    );
  });

  it('uses canon stripes when policy requiredness is none', () => {
    expect(
      resolveStudioPolicyBaseVisual(
        ov({ participates: true, canonPriority: 'required', policyRequirednessNone: true }),
      ),
    ).toBe('canon_required');
    expect(
      resolveStudioPolicyBaseVisual(
        ov({ participates: true, canonPriority: 'recommended', policyRequirednessNone: true }),
      ),
    ).toBe('canon_recommended');
  });

  it('prefers policy required over canon when participating', () => {
    expect(
      resolveStudioPolicyBaseVisual(
        ov({ participates: true, canonPriority: 'optional', requiredAlways: true }),
      ),
    ).toBe('policy_required');
    expect(
      resolveStudioPolicyBaseVisual(
        ov({ participates: true, canonPriority: 'optional', syntheticRequired: true }),
      ),
    ).toBe('policy_required');
  });

  it('surfaces required-if-visible before falling back to canon', () => {
    expect(
      resolveStudioPolicyBaseVisual(
        ov({
          participates: true,
          canonPriority: 'optional',
          requiredIfVisible: true,
        }),
      ),
    ).toBe('policy_if_visible');
  });

  it('returns a non-empty accent for every visual kind', () => {
    const kinds = [
      'outside_policy',
      'policy_required',
      'policy_if_visible',
      'canon_required',
      'canon_recommended',
      'canon_optional',
    ] as const;
    for (const k of kinds) {
      expect(studioPolicyBaseAccent(k).length).toBeGreaterThan(0);
    }
  });
});
