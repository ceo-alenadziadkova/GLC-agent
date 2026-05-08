import { z } from 'zod';
import { AGENT_OUTPUT_LIMITS } from '../config/agent-output-limits.js';
import {
  STRATEGY_COMPANY_STAGES,
  STRATEGY_EXECUTION_PACK_LIMITS,
  STRATEGY_EXECUTION_PATH_TYPES,
  STRATEGY_INITIATIVE_DOMAIN_KEYS,
  STRATEGY_INITIATIVE_LIMITS,
  STRATEGY_INITIATIVE_PRIORITIES,
  type StrategyInitiativeDomainKey,
} from '../config/strategy-initiative-policy.js';
import { CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS, DOMAIN_KEYS } from '@glc/intake-core';

import { GlcDirectorOrchestrationSliceFromToolInputSchema } from './glc-director-orchestration-slice.js';

const L = STRATEGY_INITIATIVE_LIMITS;
const EP = STRATEGY_EXECUTION_PACK_LIMITS;

const initiativeDomainEnum = [...STRATEGY_INITIATIVE_DOMAIN_KEYS] as [
  StrategyInitiativeDomainKey,
  ...StrategyInitiativeDomainKey[],
];
const companyStageEnum = [...STRATEGY_COMPANY_STAGES] as [string, ...string[]];
const initiativePriorityEnum = [...STRATEGY_INITIATIVE_PRIORITIES] as [string, ...string[]];
const pathTypeEnum = [...STRATEGY_EXECUTION_PATH_TYPES] as [string, ...string[]];
const evidenceDomainEnum = [...DOMAIN_KEYS] as [string, ...string[]];

// ─── Recon Output Schema ───────────────────────────────────
export const ReconOutputSchema = z.object({
  company_name: z.string().nullable(),
  industry: z.string().nullable(),
  industry_subcategory: z.string().nullable(),
  location: z.string().nullable(),
  estimated_size: z.string().nullable(),
  business_model: z.string().nullable(),
  target_audience: z.string().nullable(),
  key_services_products: z.array(z.string()),
  value_proposition: z.string().nullable(),
  competitive_landscape_notes: z.string().nullable(),
  regional_relevance: z.string().nullable(),
  initial_observations: z.array(z.string()),
  suggested_interview_questions: z.array(z.string()),
});

export type ReconOutput = z.infer<typeof ReconOutputSchema>;

// ─── Evidence Reference Schema ─────────────────────────────
// Each finding must cite at least one raw data point that supports it.
// type:    short key describing the check ('http_header_scan', 'page_crawl', 'html_meta_tag', etc.)
// url:     page URL where evidence was observed (omit for site-wide checks)
// finding: the raw value / observation (e.g. header name, metric value)
export const EvidenceRefSchema = z.object({
  type: z.string(),
  url: z.string().optional(),
  finding: z.string(),
});

// ─── Issue Schema ──────────────────────────────────────────
export const IssueSchema = z
  .object({
    id: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
    impact: z.string(),
  /**
   * How confident the agent is in this finding.
   * high   — directly observable from collected data
   * medium — inferred from partial signals
   * low    — assumed / no direct data available
   */
    confidence: z.enum(['high', 'medium', 'low']),
    /** Raw data points that back this finding. At least one required. */
    evidence_refs: z.array(EvidenceRefSchema).min(1).max(5),
    /** Where the finding data came from. */
    data_source: z.enum(['auto_detected', 'from_brief', 'inferred']),
    /** Reliability state for downstream quality gates and rendering. */
    status: z.enum(['confirmed', 'unverified', 'not_assessed']).optional(),
    /** How this claim was verified before report publication. */
    verification_method: z
      .enum(['single_source', 'multi_source', 'heuristic', 'manual_review', 'not_assessed'])
      .optional(),
  /**
   * Optional cross-phase premise links for causal DAG (Phase 8).
   * phase_id: recon | tech_infrastructure | … | strategy; claim_id: 1-based issue index in that phase's CO.
   */
    premise_refs: z
      .array(
        z.object({
          phase_id: z.string(),
          claim_id: z.number().int().positive(),
        }),
      )
      .max(20)
      .optional(),
  })
  .superRefine((issue, ctx) => {
    if (
      issue.status &&
      issue.status !== 'confirmed' &&
      (issue.severity === 'critical' || issue.severity === 'high')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-confirmed findings must not use critical/high severity.',
        path: ['severity'],
      });
    }
    if (issue.status === 'not_assessed' && issue.verification_method && issue.verification_method !== 'not_assessed') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'not_assessed findings must use verification_method=not_assessed.',
        path: ['verification_method'],
      });
    }
  });

// ─── Quick Win Schema ──────────────────────────────────────
export const QuickWinSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  effort: z.enum(['low', 'medium', 'high']),
  timeframe: z.string(),
});

// ─── Recommendation Schema ─────────────────────────────────
export const RecommendationSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    estimated_cost: z.string(),
    estimated_time: z.string(),
    impact: z.string(),
    evidence_refs: z.array(EvidenceRefSchema).min(1).max(5).optional(),
    data_source: z.enum(['auto_detected', 'from_brief', 'inferred']).optional(),
    status: z.enum(['confirmed', 'unverified', 'not_assessed']).optional(),
    verification_method: z
      .enum(['single_source', 'multi_source', 'heuristic', 'manual_review', 'not_assessed'])
      .optional(),
  })
  .superRefine((recommendation, ctx) => {
    const hasPercent = /\b\d{1,3}\s*-\s*\d{1,3}%|\b\d{1,3}%/.test(recommendation.impact);
    const hasSourceCue = /\b(source|benchmark|industry|study)\b/i.test(recommendation.impact);
    if (hasPercent && !hasSourceCue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Numeric impact claims require benchmark/source annotation.',
        path: ['impact'],
      });
    }
    if (
      recommendation.status &&
      recommendation.status !== 'confirmed' &&
      (recommendation.evidence_refs?.length ?? 0) === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-confirmed recommendations should include rationale evidence_refs or remain omitted.',
        path: ['evidence_refs'],
      });
    }
    if (
      recommendation.status === 'not_assessed' &&
      recommendation.verification_method &&
      recommendation.verification_method !== 'not_assessed'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'not_assessed recommendations must use verification_method=not_assessed.',
        path: ['verification_method'],
      });
    }
  });

// ─── Domain Analysis Output ────────────────────────────────
export const DomainOutputSchema = z.object({
  score: z.number().int().min(1).max(5),
  label: z.string(),
  summary: z
    .string()
    .min(AGENT_OUTPUT_LIMITS.domainSummaryMinChars)
    .max(AGENT_OUTPUT_LIMITS.domainSummaryMaxChars),
  strengths: z.array(z.string()).min(1).max(8),
  weaknesses: z.array(z.string()).min(1).max(8),
  issues: z.array(IssueSchema).min(1).max(10),
  quick_wins: z.array(QuickWinSchema).max(5),
  recommendations: z.array(RecommendationSchema).min(1).max(8),
  /**
   * Areas the agent could not evaluate due to missing or unavailable data.
   * E.g. ["Page speed data unavailable — server-side crawl only", "No pricing page found"]
   * Leave empty array if all areas were assessable.
   */
  unknown_items: z.array(z.string()).max(10),
  /**
   * Optional Director execution bundle for cross-domain orchestration (Layer 2 → 3).
   * When `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT` is on, phases in the effective strict set
   * (`director-orchestration-policy.ts`, optionally narrowed by `DIRECTOR_ORCHESTRATION_STRICT_PHASE_PILOT`)
   * require a parseable slice before the row is accepted.
   */
  glc_director_execution: GlcDirectorOrchestrationSliceFromToolInputSchema,
});

export type DomainOutput = z.infer<typeof DomainOutputSchema>;

// ─── Strategy Output ───────────────────────────────────────
export const StrategyInitiativeEvidenceSourceSchema = z.object({
  domain_key: z.enum(evidenceDomainEnum),
  /** When set, must match an issue id from that domain's saved audit output (validated server-side). */
  issue_id: z.string().max(L.idMaxLength).optional(),
  /** Free-text signal when no stable issue id exists. */
  signal: z.string().max(L.bulletMaxLength).optional(),
});

export const StrategyInitiativeCrossDomainDependencySchema = z.object({
  domain_key: z.enum(evidenceDomainEnum),
  hypothesis_id: z
    .string()
    .regex(
      /^(tech_infrastructure|security_compliance|seo_digital|ux_conversion|marketing_utp|automation_processes):H[1-9]\d*$/,
    )
    .optional(),
  conflict_id: z.string().regex(/^CONF-[1-9]\d*$/).optional(),
});

export const StrategyInitiativeExecutionPathSchema = z.object({
  type: z.enum(pathTypeEnum),
  description: z.string().min(1).max(L.pathDescriptionMaxLength),
  time_estimate: z.string().min(1).max(L.pathTimeEstimateMaxLength),
  tools: z.array(z.string().min(1).max(L.pathToolNameMaxLength)).max(L.pathToolsMax).optional(),
  architecture: z.string().max(L.pathDescriptionMaxLength).optional(),
  steps: z.array(z.string().min(1).max(L.pathStepMaxLength)).max(L.pathStepsMax).optional(),
  incompatible: z.boolean().optional(),
  incompatibility_reason: z.string().max(80).optional(),
});

export const StrategyInitiativeSchema = z.object({
  id: z.string().min(1).max(L.idMaxLength),
  title: z.string().min(L.titleMinLength).max(L.titleMaxLength),
  description: z.string().min(1).max(L.descriptionMaxLength),
  domain: z.enum(initiativeDomainEnum),
  stage: z.enum(companyStageEnum),
  priority: z.enum(initiativePriorityEnum),
  impact: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(L.confidenceMin).max(L.confidenceMax),
  context: z.object({
    signals: z.array(z.string().min(1).max(L.bulletMaxLength)).min(L.contextSignalsMin).max(L.contextSignalsMax),
    problems: z.array(z.string().min(1).max(L.bulletMaxLength)).max(L.contextProblemsMax).optional(),
    risks: z.array(z.string().min(1).max(L.bulletMaxLength)).max(L.contextRisksMax).optional(),
  }),
  outcome: z.object({
    description: z.string().min(1).max(L.outcomeDescriptionMaxLength),
    timeframe: z.string().max(L.outcomeTimeframeMaxLength).optional(),
  }),
  scope: z.object({
    includes: z.array(z.string().min(1).max(L.bulletMaxLength)).min(L.scopeIncludesMin).max(L.scopeIncludesMax),
    excludes: z.array(z.string().min(1).max(L.bulletMaxLength)).min(L.scopeExcludesMin).max(L.scopeExcludesMax),
  }),
  execution_paths: z
    .array(StrategyInitiativeExecutionPathSchema)
    .min(L.executionPathsMin)
    .max(L.executionPathsMax),
  dependencies: z.array(z.string().min(1).max(L.idMaxLength)).max(L.dependenciesMax).optional(),
  alternatives: z
    .array(
      z.object({
        name: z.string().min(1).max(L.alternativeNameMaxLength),
        type: z.string().max(40).optional(),
        pros: z.array(z.string().min(1).max(L.alternativeBulletMaxLength)).max(L.alternativeBulletsMax).optional(),
        cons: z.array(z.string().min(1).max(L.alternativeBulletMaxLength)).max(L.alternativeBulletsMax).optional(),
      }),
    )
    .max(L.alternativesMax)
    .optional(),
  automation: z
    .object({
      level: z.enum(['none', 'low', 'medium', 'high']),
      tools: z.array(z.string().min(1).max(L.pathToolNameMaxLength)).max(L.pathToolsMax).optional(),
    })
    .optional(),
  constraints: z
    .object({
      budget: z.string().max(80).optional(),
      team: z.string().max(80).optional(),
      tech: z.string().max(200).optional(),
    })
    .optional(),
  readiness: z
    .object({
      score: z.number().min(0).max(1),
      blockers: z.array(z.string().min(1).max(L.readinessBlockerMaxLength)).max(L.readinessBlockersMax).optional(),
    })
    .optional(),
  decision: z.object({
    why_this: z.array(z.string().min(1).max(L.bulletMaxLength)).min(L.whyThisMin).max(L.whyThisMax),
    tradeoffs: z.array(z.string().min(1).max(L.bulletMaxLength)).max(L.tradeoffsMax).optional(),
    if_skipped: z.array(z.string().min(1).max(L.bulletMaxLength)).max(L.ifSkippedMax).optional(),
  }),
  evidence: z.object({
    sources: z
      .array(StrategyInitiativeEvidenceSourceSchema)
      .min(1)
      .max(L.evidenceSourcesMax),
    cross_domain_dependencies: z
      .array(StrategyInitiativeCrossDomainDependencySchema)
      .max(L.crossDomainDependenciesMax)
      .default([]),
  }),
  /** Set server-side after evidence link validation. */
  evidence_verified: z.boolean().optional(),
  /**
   * Optional stable hint for Delivery Board `canonical_node_key` (Epic 1).
   * When set, renaming `title` does not orphan the card while manifest signature + lane match.
   */
  board_identity_key: z.string().min(1).max(CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS).optional(),
});

/** One initiative's generated execution pack (on-demand Claude output). */
export const StrategyExecutionPackItemSchema = z.object({
  initiative_id: z.string().min(1).max(L.idMaxLength),
  tasks: z.array(z.string().min(1).max(EP.taskMaxLength)).min(1).max(EP.tasksMax),
  architecture: z.string().min(1).max(EP.architectureMaxLength),
  artifacts: z.array(z.string().min(1).max(EP.artifactMaxLength)).max(EP.artifactsMax).optional(),
  templates: z.array(z.string().min(1).max(EP.templateMaxLength)).max(EP.templatesMax).optional(),
  prompts: z.array(z.string().min(1).max(EP.promptMaxLength)).max(EP.promptsMax).optional(),
  /** How delivery will be validated — all fields optional for backward compatibility. */
  outcome_measurement: z
    .object({
      success_metric: z.string().min(1).max(EP.outcomeMetricMaxLength).optional(),
      baseline: z.string().min(1).max(EP.baselineMaxLength).optional(),
      review_cadence: z.string().min(1).max(EP.reviewCadenceMaxLength).optional(),
    })
    .optional(),
});

export const StrategyExecutionPackOutputSchema = z.object({
  packs: z.array(StrategyExecutionPackItemSchema).min(1),
});

export const StrategyOutputSchema = z.object({
  executive_summary: z
    .string()
    .min(AGENT_OUTPUT_LIMITS.strategyExecutiveSummaryMinChars)
    .max(AGENT_OUTPUT_LIMITS.strategyExecutiveSummaryMaxChars),
  overall_score: z.number().min(1).max(5),
  quick_wins: z.array(StrategyInitiativeSchema).min(2).max(6),
  medium_term: z.array(StrategyInitiativeSchema).min(2).max(6),
  strategic: z.array(StrategyInitiativeSchema).min(1).max(4),
  scorecard: z.array(z.object({
    domain_key: z.string(),
    label: z.string(),
    score: z.number().int().min(1).max(5),
    weight: z.number(),
    weighted_score: z.number(),
  })),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

export type StrategyInitiative = z.infer<typeof StrategyInitiativeSchema>;
export type StrategyExecutionPackOutput = z.infer<typeof StrategyExecutionPackOutputSchema>;

// ─── JSON Schema versions (for Claude tool_use) ───────────
// Converts Zod schemas to JSON Schema for Claude's tool_use parameter.
// Handles all constraints used in this codebase: min/max/int on numbers,
// minLength/maxLength on strings, minItems/maxItems on arrays.

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  return zodToJson(schema);
}

// Internal Zod _def types we rely on (not exported by Zod)
type ZodNumberCheck = { kind: 'int' } | { kind: 'min'; value: number; inclusive: boolean } | { kind: 'max'; value: number; inclusive: boolean };
type ZodStringCheck = { kind: 'min'; value: number } | { kind: 'max'; value: number } | { kind: string };
type ZodArrayDef = { minLength: { value: number } | null; maxLength: { value: number } | null };

function zodToJson(schema: z.ZodTypeAny): Record<string, unknown> {
  // ── Object ───────────────────────────────────────────────
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJson(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }
    return { type: 'object', properties, required };
  }

  // ── Array — with minItems / maxItems ─────────────────────
  if (schema instanceof z.ZodArray) {
    const result: Record<string, unknown> = { type: 'array', items: zodToJson(schema.element) };
    const def = schema._def as unknown as ZodArrayDef;
    if (def.minLength?.value != null) result.minItems = def.minLength.value;
    if (def.maxLength?.value != null) result.maxItems = def.maxLength.value;
    return result;
  }

  // ── String — with minLength / maxLength ──────────────────
  if (schema instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    const checks = ((schema._def as unknown as { checks?: ZodStringCheck[] }).checks) ?? [];
    for (const check of checks) {
      if (check.kind === 'min') result.minLength = (check as { kind: 'min'; value: number }).value;
      if (check.kind === 'max') result.maxLength = (check as { kind: 'max'; value: number }).value;
    }
    return result;
  }

  // ── Number — with minimum / maximum / integer ────────────
  if (schema instanceof z.ZodNumber) {
    const result: Record<string, unknown> = { type: 'number' };
    const checks = ((schema._def as unknown as { checks?: ZodNumberCheck[] }).checks) ?? [];
    for (const check of checks) {
      if (check.kind === 'int') result.type = 'integer';
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }
    return result;
  }

  // ── Primitives ───────────────────────────────────────────
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: schema.options };
  if (schema instanceof z.ZodLiteral) return { const: schema._def.value };

  // ── Wrappers ─────────────────────────────────────────────
  if (schema instanceof z.ZodNullable) return { ...zodToJson(schema.unwrap()), nullable: true };
  if (schema instanceof z.ZodOptional) return zodToJson(schema.unwrap());
  if (schema instanceof z.ZodDefault) return zodToJson(schema._def.innerType);
  // `.superRefine` / transforms wrap inner schema — JSON Schema mirrors the structural shape only.
  if (schema instanceof z.ZodEffects) {
    const inner = (schema._def as { schema: z.ZodTypeAny }).schema;
    return zodToJson(inner);
  }

  // Fallback
  return { type: 'string' };
}
