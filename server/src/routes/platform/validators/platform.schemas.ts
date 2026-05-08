import { z } from 'zod';
import { DOMAIN_KEYS } from '../../../types/audit.js';
import { PLATFORM_RUNTIME_POLICY_PATCH_FIELDS } from '../../../config/platform-runtime-policy.js';

const runtimePolicyFieldSchema = z.union([z.number().int().positive(), z.null()]);

const runtimePolicyPatchRawSchema = z
  .object(
    PLATFORM_RUNTIME_POLICY_PATCH_FIELDS.reduce(
      (acc, field) => {
        acc[field] = runtimePolicyFieldSchema.optional();
        return acc;
      },
      {} as Record<(typeof PLATFORM_RUNTIME_POLICY_PATCH_FIELDS)[number], z.ZodOptional<typeof runtimePolicyFieldSchema>>,
    ),
  )
  .strict()
  .superRefine((val, ctx) => {
    const hasAtLeastOneField = PLATFORM_RUNTIME_POLICY_PATCH_FIELDS.some((field) => val[field] !== undefined);
    if (!hasAtLeastOneField) {
      ctx.addIssue({ code: z.ZodIssueCode.custom });
    }
  });

export function safeParseRuntimePolicyPatch(body: unknown) {
  return runtimePolicyPatchRawSchema.safeParse(body);
}

const selfServeOwnerPatchBodySchema = z
  .object({
    owner_user_id: z.union([z.string(), z.null()]),
  })
  .strict()
  .transform((val) => {
    if (val.owner_user_id === null) {
      return { ownerUserId: null as string | null };
    }
    const trimmed = val.owner_user_id.trim();
    return { ownerUserId: trimmed.length > 0 ? trimmed : null };
  });

export function safeParseSelfServeOwnerPatchBody(body: unknown) {
  return selfServeOwnerPatchBodySchema.safeParse(body);
}

export const consultantAllowlistAddBodySchema = z
  .object({
    email: z.string(),
  })
  .strict();

export const consultantAllowlistDeleteQuerySchema = z.object({
  email: z.string().optional(),
});

export const strategyRepairedJsonApplyBodySchema = z
  .object({
    strategy_tool_input: z.unknown(),
    force_replace_completed_audit: z.boolean().optional(),
  })
  .strict();

export function safeParseStrategyRepairedJsonApplyBody(body: unknown) {
  return strategyRepairedJsonApplyBodySchema.safeParse(body);
}

export const banditRecomputeBodySchema = z
  .object({
    phase_id: z.enum(DOMAIN_KEYS).optional(),
    dry_run: z.boolean().optional(),
  })
  .strict();
