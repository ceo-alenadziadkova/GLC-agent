import { z } from 'zod';
import type { IntakeBriefCollectionMode } from '../../../types/audit.js';

export const UPGRADE_COVERAGE_PACKAGES = ['starter', 'pro', 'complete'] as const;

export const upgradeSnapshotBodySchema = z.object({
  coverage_package: z.enum(UPGRADE_COVERAGE_PACKAGES),
  use_scraped_context: z.boolean(),
});

export const BRIEF_COLLECTION_MODES = [
  'self_serve',
  'interview',
  'pre_brief',
  'discovery',
] as const satisfies readonly IntakeBriefCollectionMode[];

export const BRIEF_HELP_ALLOWED_AUDIT_STATUS = 'created';
export const FREE_SNAPSHOT_UX_DOMAIN_KEY = 'ux_conversion';
export const AUDIT_UI_ROUTE_PREFIX = '/audit';
