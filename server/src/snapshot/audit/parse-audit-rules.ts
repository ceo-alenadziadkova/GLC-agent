import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { SnapshotAuditCategorySchema } from '../types.js';

export const AuditRuleRowSchema = z.object({
  id: z.string(),
  category: SnapshotAuditCategorySchema,
  maxPoints: z.number(),
  evaluator: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  impactTier: z.enum(['high', 'medium', 'low']),
  issueKey: z.string(),
  quickWinKey: z.string(),
  /** If set, rule runs only when `site_profile.siteType` is one of these (unknown never matches). */
  onlyForSiteTypes: z.array(z.string()).optional(),
  /** If set, rule is skipped when `site_profile.siteType` is one of these. */
  skipForSiteTypes: z.array(z.string()).optional(),
});

export const AuditRulesFileSchema = z.object({
  version: z.number(),
  rules: z.array(AuditRuleRowSchema),
});

export type AuditRuleRow = z.infer<typeof AuditRuleRowSchema>;

let cached: z.infer<typeof AuditRulesFileSchema> | null = null;

export function resetAuditRulesCache(): void {
  cached = null;
}

export function getAuditRules(): AuditRuleRow[] {
  if (cached) return cached.rules;
  loadAuditRulesFile();
  return cached!.rules;
}

export function getAuditRulesCatalogVersion(): number {
  if (!cached) loadAuditRulesFile();
  return cached!.version;
}

function loadAuditRulesFile(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const serverRoot = join(here, '../../..');
  const path = join(serverRoot, 'config/snapshot/audit-rules.v1.yaml');
  const raw = readFileSync(path, 'utf8');
  cached = AuditRulesFileSchema.parse(parseYaml(raw));
}

/** Whether this rule contributes to the score for the given classifier site type. */
export function auditRuleAppliesToSiteType(rule: AuditRuleRow, siteType: string): boolean {
  if (rule.skipForSiteTypes?.length && rule.skipForSiteTypes.includes(siteType)) {
    return false;
  }
  if (rule.onlyForSiteTypes?.length) {
    if (siteType === 'unknown') return false;
    return rule.onlyForSiteTypes.includes(siteType);
  }
  return true;
}
