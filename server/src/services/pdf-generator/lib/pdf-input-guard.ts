import { z } from 'zod';

import type { ReportInput } from '../../report-profiler.js';

const nullableString = z.string().trim().max(10_000).nullable();
const optionalNullableString = z.string().trim().max(10_000).optional().nullable();

const issueSchema = z.object({
  id: z.string().trim().min(1).max(256),
  severity: z.string().trim().min(1).max(32),
  title: z.string().trim().min(1).max(10_000),
  description: z.string().trim().max(10_000).default(''),
  impact: z.string().trim().max(10_000).default(''),
  confidence: optionalNullableString,
});

const quickWinSchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(10_000),
  description: z.string().trim().default(''),
  effort: optionalNullableString,
  timeframe: optionalNullableString,
});

const recommendationSchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(10_000),
  description: z.string().trim().default(''),
  priority: z.string().trim().min(1).max(32),
  estimated_cost: optionalNullableString,
  estimated_time: optionalNullableString,
  impact: optionalNullableString,
});

const domainSchema = z.object({
  domain_key: z.string().trim().min(1).max(128),
  score: z.number().finite().min(0).max(5).nullable().optional().default(null),
  label: nullableString.optional().default(null),
  summary: nullableString.optional().default(null),
  strengths: z.array(z.string().trim().max(10_000)).nullable().optional().default(null),
  weaknesses: z.array(z.string().trim().max(10_000)).nullable().optional().default(null),
  issues: z.array(issueSchema).nullable().optional().default(null),
  quick_wins: z.array(quickWinSchema).nullable().optional().default(null),
  recommendations: z.array(recommendationSchema).nullable().optional().default(null),
  status: z.string().trim().min(1).max(64),
  phase_number: z.number().int().nonnegative().optional().default(0),
});

const strategyItemSchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(10_000),
  description: z.string().trim().default(''),
  effort: optionalNullableString,
  impact: optionalNullableString,
});

const strategySchema = z
  .object({
    executive_summary: optionalNullableString,
    overall_score: z.number().finite().min(0).max(5).optional().nullable(),
    quick_wins: z.array(strategyItemSchema).optional().nullable(),
    medium_term: z.array(strategyItemSchema).optional().nullable(),
    strategic: z.array(strategyItemSchema).optional().nullable(),
    scorecard: z
      .array(
        z.object({
          domain_key: z.string().trim().min(1).max(128),
          label: z.string().trim().min(1).max(64),
          score: z.number().finite().min(0).max(5),
          weight: z.number().finite().nonnegative(),
          weighted_score: z.number().finite().nonnegative(),
        }),
      )
      .optional()
      .nullable(),
  })
  .nullable();

const auditSchema = z.object({
  company_url: z.string().trim().min(1).max(2048),
  created_at: z.string().trim().min(1).max(128),
  overall_score: z.number().finite().min(0).max(5).nullable().optional().default(null),
  no_public_website: z.boolean().optional().nullable(),
  industry: optionalNullableString,
  execution_plan: z
    .object({
      selected_domains: z.array(z.string().trim().min(1).max(128)).optional(),
    })
    .optional()
    .nullable(),
});

const reconSchema = z
  .object({
    company_name: optionalNullableString,
    industry: optionalNullableString,
    location: optionalNullableString,
  })
  .nullable();

const reportInputSchema = z.object({
  audit: auditSchema,
  recon: reconSchema,
  domains: z.array(domainSchema).max(100),
  strategy: strategySchema,
  brief_responses: z.record(z.unknown()).optional().nullable(),
});

export function validatePdfReportInput(input: unknown):
  | { ok: true; value: ReportInput }
  | { ok: false; issues: string[] } {
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`),
    };
  }
  return { ok: true, value: parsed.data as ReportInput };
}
