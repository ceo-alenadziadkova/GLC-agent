import type { IntakeBriefCollectionMode } from '../types/audit.js';

/** Default when `intake_brief.collection_mode` is missing (legacy rows). */
export const PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE: IntakeBriefCollectionMode = 'self_serve';
