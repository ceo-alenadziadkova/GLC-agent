import type { IntakeBriefCollectionMode, ProductMode } from '../../data/auditTypes';
import type { IntakeSurface } from '@glc/intake-core';
import type { StudioLayoutSurfaceKey } from '../../lib/question-bank-studio-graph';
import type { StudioPolicyBaseVisualKind } from '../../lib/question-bank-studio-node-style';
import type { StudioPolicyMode } from '../../lib/question-bank-studio-policy';

export const POLICY_STRIPE_INSPECTOR: Record<StudioPolicyBaseVisualKind, string> = {
  outside_policy: 'Outside policy slice (not in this product mode)',
  policy_required: 'Policy required or synthetic required (left stripe)',
  policy_if_visible: 'Required if visible when in express SLA (amber stripe)',
  canon_required: 'Canon required in bank JSON (blue stripe)',
  canon_recommended: 'Canon recommended (gray stripe)',
  canon_optional: 'Canon optional (light gray stripe)',
};

export const POLICY_MODE_OPTIONS: { value: StudioPolicyMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'discovery', label: 'discover (discovery)' },
  { value: 'pre_brief', label: 'brief (pre_brief)' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

export const LAYOUT_SURFACE_OPTIONS: { value: '' | StudioLayoutSurfaceKey; label: string }[] = [
  { value: '', label: 'Flat (schema sections only)' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'public_discovery', label: 'public_discovery' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
];

export const TRACE_PRODUCT_OPTIONS: { value: ProductMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

export const TRACE_COLLECTION_OPTIONS: { value: IntakeBriefCollectionMode | ''; label: string }[] = [
  { value: '', label: '(none)' },
  { value: 'discovery', label: 'discovery' },
  { value: 'pre_brief', label: 'pre_brief' },
  { value: 'interview', label: 'interview' },
  { value: 'self_serve', label: 'self_serve' },
];

export const TRACE_SURFACE_OPTIONS: { value: IntakeSurface | ''; label: string }[] = [
  { value: '', label: '(none)' },
  { value: 'public_discovery', label: 'public_discovery' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
  { value: 'internal_review', label: 'internal_review' },
];

