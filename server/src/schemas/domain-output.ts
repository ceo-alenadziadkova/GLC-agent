import { z } from 'zod';

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
  mallorca_relevance: z.string().nullable(),
  initial_observations: z.array(z.string()),
  suggested_interview_questions: z.array(z.string()),
});

export type ReconOutput = z.infer<typeof ReconOutputSchema>;

// ─── Issue Schema ──────────────────────────────────────────
export const IssueSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
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
export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  estimated_cost: z.string(),
  estimated_time: z.string(),
  impact: z.string(),
});

// ─── Domain Analysis Output ────────────────────────────────
export const DomainOutputSchema = z.object({
  score: z.number().int().min(1).max(5),
  label: z.string(),
  summary: z.string().min(50).max(2000),
  strengths: z.array(z.string()).min(1).max(8),
  weaknesses: z.array(z.string()).min(1).max(8),
  issues: z.array(IssueSchema).min(1).max(10),
  quick_wins: z.array(QuickWinSchema).max(5),
  recommendations: z.array(RecommendationSchema).min(1).max(8),
});

export type DomainOutput = z.infer<typeof DomainOutputSchema>;

// ─── Strategy Output ───────────────────────────────────────
export const StrategyInitiativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['low', 'medium', 'high']),
  dependencies: z.array(z.string()).optional(),
});

export const StrategyOutputSchema = z.object({
  executive_summary: z.string().min(100).max(3000),
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

// ─── JSON Schema versions (for Claude tool_use) ───────────
// Convert Zod schemas to JSON Schema for Claude's tool_use parameter

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Minimal implementation for our use case
  // In production, use zod-to-json-schema package
  return zodToJson(schema);
}

function zodToJson(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJson(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJson(schema.element) };
  }

  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodNullable) return { ...zodToJson(schema.unwrap()), nullable: true };
  if (schema instanceof z.ZodOptional) return zodToJson(schema.unwrap());

  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options };
  }

  return { type: 'string' };
}
