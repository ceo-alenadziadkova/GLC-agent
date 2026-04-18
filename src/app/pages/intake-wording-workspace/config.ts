import type {
  WorkspaceCollectionOption,
  WorkspaceProductOption,
  WorkspaceSurfaceOption,
} from './types';

import { INTAKE_TRACE_SCENARIO_PRESETS } from '../../lib/intake-trace-scenarios';

export const INTAKE_WORDING_ROUTE = '/admin/intake-wording';
export const WORKSPACE_PANEL = 'wording';

export const PRODUCT_OPTIONS: WorkspaceProductOption[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

export const COLLECTION_OPTIONS: WorkspaceCollectionOption[] = [
  { value: '', label: '(omit)' },
  { value: 'self_serve', label: 'self_serve' },
  { value: 'interview', label: 'interview' },
  { value: 'pre_brief', label: 'pre_brief' },
  { value: 'discovery', label: 'discovery' },
];

export const SURFACE_OPTIONS: WorkspaceSurfaceOption[] = [
  { value: '', label: '(omit)' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
  { value: 'internal_review', label: 'internal_review' },
  { value: 'public_discovery', label: 'public_discovery' },
];

export const DEFAULT_SCENARIO_PRESET = INTAKE_TRACE_SCENARIO_PRESETS[0];
