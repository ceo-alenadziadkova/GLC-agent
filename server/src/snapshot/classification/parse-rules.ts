import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const SignalSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('schemaTypeAny'), types: z.array(z.string()) }),
  z.object({ kind: z.literal('ctaSubstringAny'), substrings: z.array(z.string()) }),
  z.object({ kind: z.literal('techAny'), names: z.array(z.string()) }),
  z.object({ kind: z.literal('slugAny'), substrings: z.array(z.string()) }),
  z.object({
    kind: z.literal('keywordAny'),
    fields: z.array(z.string()),
    substrings: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('contactAll'),
    flags: z.array(z.enum(['phonePresent', 'emailPresent', 'addressPresent', 'openingHoursPresent'])),
  }),
  z.object({ kind: z.literal('formPresent') }),
]);

export type SignalDef = z.infer<typeof SignalSchema>;

const TaxonSchema = z.object({
  id: z.string(),
  priority: z.number().optional(),
  minMatch: z.number(),
  signals: z.array(SignalSchema),
  parentSiteTypes: z.array(z.string()).optional(),
});

export const ClassificationRulesSchema = z.object({
  version: z.number(),
  tieDeltaThreshold: z.number(),
  globalCaps: z.object({
    contentQualityLow: z.enum(['high', 'medium', 'low']),
    tieAmbiguous: z.enum(['high', 'medium', 'low']),
    noSchemaThinText: z.enum(['high', 'medium', 'low']),
  }),
  supportedLangPrefixes: z.array(z.string()),
  /** When two site types tie within tieDeltaThreshold, prefer the one listed earlier. */
  tieBreakOrder: z.array(z.string()).optional(),
  /** Log detailed signal outcomes (also enable with SNAPSHOT_CLASSIFICATION_DEBUG=1). */
  debugSignals: z.boolean().optional(),
  siteTypes: z.array(TaxonSchema),
  industries: z.array(TaxonSchema),
  conversionModels: z.array(TaxonSchema),
});

export type ClassificationRules = z.infer<typeof ClassificationRulesSchema>;

let cached: ClassificationRules | null = null;

export function getClassificationRules(): ClassificationRules {
  if (cached) return cached;
  const here = dirname(fileURLToPath(import.meta.url));
  const serverRoot = join(here, '../../..');
  const path = join(serverRoot, 'config/snapshot/classification-rules.v1.yaml');
  const raw = readFileSync(path, 'utf8');
  const doc = parseYaml(raw);
  cached = ClassificationRulesSchema.parse(doc);
  return cached;
}

export function resetClassificationRulesCache(): void {
  cached = null;
}

export function getClassificationRulesVersion(): number {
  return getClassificationRules().version;
}
