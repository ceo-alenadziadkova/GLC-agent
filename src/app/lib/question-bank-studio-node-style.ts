import type { PolicyOverlay } from './question-bank-studio-policy';

export type StudioPolicyBaseVisualKind =
  | 'outside_policy'
  | 'policy_required'
  | 'policy_if_visible'
  | 'canon_required'
  | 'canon_recommended'
  | 'canon_optional';

function normalizeCanonPriority(p: string): 'required' | 'recommended' | 'optional' {
  const x = p.trim().toLowerCase();
  if (x === 'required') return 'required';
  if (x === 'recommended') return 'recommended';
  return 'optional';
}

/**
 * Card chrome for question nodes: policy / canon priority (inner signal).
 * Trace ring (required / visible / deferred / hidden) is applied separately in the Studio shell.
 */
export function resolveStudioPolicyBaseVisual(overlay: PolicyOverlay): StudioPolicyBaseVisualKind {
  if (!overlay.participates) return 'outside_policy';
  if (overlay.policyRequirednessNone) {
    const p = normalizeCanonPriority(overlay.canonPriority);
    if (p === 'required') return 'canon_required';
    if (p === 'recommended') return 'canon_recommended';
    return 'canon_optional';
  }
  if (overlay.syntheticRequired || overlay.requiredAlways) return 'policy_required';
  if (overlay.requiredIfVisible) return 'policy_if_visible';
  const p = normalizeCanonPriority(overlay.canonPriority);
  if (p === 'required') return 'canon_required';
  if (p === 'recommended') return 'canon_recommended';
  return 'canon_optional';
}

/** Left accent color (hex) for policy/canon base visual; works in light and dark shells. */
export function studioPolicyBaseAccent(kind: StudioPolicyBaseVisualKind): string {
  switch (kind) {
    case 'policy_required':
      return 'var(--glc-orange)';
    case 'policy_if_visible':
      return 'var(--ui-warning-amber)';
    case 'canon_required':
      return 'var(--studio-graph-domain-tech-infrastructure)';
    case 'canon_recommended':
      return 'var(--ui-intake-edge-stroke)';
    case 'canon_optional':
      return 'var(--ui-intake-node-other-stroke)';
    case 'outside_policy':
    default:
      return 'var(--border-default)';
  }
}
