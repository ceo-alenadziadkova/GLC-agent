import type { IntakeSurface } from '@glc/intake-core';

import type { IntakeBriefCollectionMode } from '../types/audit.js';

/** Plan context for public pre-brief bundle (token load / prefill / merge). */
export const INTAKE_PREBRIEF_PUBLIC_PLAN_COLLECTION_MODE = 'pre_brief' as const satisfies IntakeBriefCollectionMode;

export const INTAKE_PREBRIEF_PUBLIC_PLAN_SURFACE = 'client_form' as const satisfies IntakeSurface;
