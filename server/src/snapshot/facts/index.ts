import type { FetchedPage, SnapshotFacts } from '../types.js';
import { htmlLooksLikeClientShell } from './domain/content-quality.js';
import { buildEmptyFacts } from './mappers/empty-facts.mapper.js';
import {
  extractFacts as extractFactsOrchestrated,
  type ExtractFactsOptions,
} from './orchestrators/extract-facts.orchestrator.js';

export { buildEmptyFacts, htmlLooksLikeClientShell };
export type { ExtractFactsOptions };

export function extractFacts(
  pages: FetchedPage[],
  normalizedBaseUrl: string,
  opts?: ExtractFactsOptions,
): SnapshotFacts {
  return extractFactsOrchestrated(pages, normalizedBaseUrl, opts, buildEmptyFacts);
}

export function getHeroPrimaryCtaCount(facts: SnapshotFacts): number {
  return facts.heroPrimaryCtaCount ?? 0;
}

export function getGenericMarketingHero(facts: SnapshotFacts): boolean {
  return facts.genericMarketingHero ?? false;
}
