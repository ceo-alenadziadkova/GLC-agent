import { z } from 'zod';
import { intakeAnalyticsAuditBriefBatchSchema } from '../../../schemas/intake-analytics-events.js';
import { upgradeSnapshotBodySchema } from '../config/audits-route-policy.js';

export const auditIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listAuditsQuerySchema = z.object({
  limit: z.union([z.string(), z.number()]).optional(),
  offset: z.union([z.string(), z.number()]).optional(),
});

export const briefPutBodySchema = z.object({
  responses: z.record(z.string(), z.unknown()),
  collection_mode: z.union([z.string(), z.null()]).optional(),
  intake_versions: z.unknown().optional(),
});

export const briefHelpRequestBodySchema = z.object({
  message: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

export const briefAnalyticsBodySchema = intakeAnalyticsAuditBriefBatchSchema;
export const upgradeFromSnapshotBodySchema = upgradeSnapshotBodySchema;
