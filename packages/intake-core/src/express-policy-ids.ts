/**
 * Express SLA ids from intake policy (single source with intake-policy.v1.json).
 */
import { INTAKE_POLICY_V1 } from './core/load-policy.js';

/** Always required for express path (includes synthetic revenue bank id `a10`). */
export const EXPRESS_REQUIRED_ALWAYS_IDS = [...INTAKE_POLICY_V1.modes.express.requiredAlways] as const;

/** Added when the website branch makes these questions visible. */
export const EXPRESS_REQUIRED_IF_VISIBLE_IDS = [...INTAKE_POLICY_V1.modes.express.requiredIfVisible] as const;
