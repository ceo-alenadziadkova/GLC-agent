import type { ReconOutput } from '../../schemas/domain-output.js';
import type { ReconContextMode, ReconContextSummary } from '../../types/audit/entities-recon.js';
import {
  RECON_CONSULTANT_HINTS_COPY_EN,
  RECON_CONTEXT_SUMMARY_CONSULTANT_HINTS_POLICY,
} from '../../config/recon-consultant-hints.en.js';

/** Crawl-derived booleans used only for consultant hint quality (Phase 0). */
export type ReconCrawlSignalsForSummary = {
  hasTechSignals: boolean;
  hasSocialProfiles: boolean;
  hasPrimaryContact: boolean;
};

export function extractReconCrawlSignalsForSummary(input: {
  tech_stack?: Record<string, unknown> | null;
  social_profiles?: Record<string, unknown> | null;
  contact_info?: {
    emails?: unknown[] | null;
    phones?: unknown[] | null;
    addresses?: unknown[] | null;
  } | null;
}): ReconCrawlSignalsForSummary {
  const tech = input.tech_stack ?? {};
  const hasTechSignals = Object.values(tech).some((v) => Array.isArray(v) && v.length > 0);
  const social = input.social_profiles ?? {};
  const hasSocialProfiles = Object.values(social).some((v) => typeof v === 'string' && v.trim().length > 0);
  const ci = input.contact_info ?? {};
  const emails = Array.isArray(ci.emails) ? ci.emails : [];
  const phones = Array.isArray(ci.phones) ? ci.phones : [];
  const hasPrimaryContact =
    emails.some((e) => typeof e === 'string' && e.trim().length > 0) ||
    phones.some((p) => typeof p === 'string' && p.trim().length > 0);

  return { hasTechSignals, hasSocialProfiles, hasPrimaryContact };
}

function buildConsultantHints(params: {
  mode: ReconContextMode;
  noPublicSite: boolean;
  crawledPageCount: number;
  reconResult: ReconOutput;
  missingInputs: string[];
  crawlSignals: ReconCrawlSignalsForSummary | null;
}): string[] {
  const C = RECON_CONSULTANT_HINTS_COPY_EN;
  const POLICY = RECON_CONTEXT_SUMMARY_CONSULTANT_HINTS_POLICY;
  const hints: string[] = [];

  const add = (text: string) => {
    if (hints.includes(text)) return;
    hints.push(text);
  };

  const { mode, noPublicSite, crawledPageCount, reconResult, missingInputs, crawlSignals } = params;

  if (noPublicSite) {
    add(C.askPublicFootprint);
    add(C.askArtifactsNoSite);
  }

  if (!reconResult.value_proposition) add(C.askValueProposition);
  if (!reconResult.target_audience) add(C.askTargetAudience);
  if (reconResult.key_services_products.length === 0) add(C.askProductsServices);

  if (
    !noPublicSite &&
    crawledPageCount > 0 &&
    crawledPageCount <= POLICY.thinCrawlPageMax
  ) {
    add(C.askWebEvidenceThin);
  }

  if (!noPublicSite && crawledPageCount > 0 && crawlSignals != null) {
    if (!crawlSignals.hasTechSignals) add(C.crawlTechThin);
    if (!crawlSignals.hasSocialProfiles) add(C.crawlSocialThin);
    if (!crawlSignals.hasPrimaryContact) add(C.crawlContactThin);
  }

  if (mode === 'idea_only') add(C.modeIdeaDiscovery);
  if (mode === 'problem_only') add(C.modeProblemBaseline);
  if (mode === 'mixed_limited_data') add(C.modeMixedLockTruth);

  if (mode === 'website_crawl' && missingInputs.length === 0) {
    add(C.websiteApproveWithCorrections);
  }

  return hints.slice(0, POLICY.maxHints);
}

const IDEA_KEYWORDS = /\b(idea|concept|prototype|mvp|new product|new service|validate)\b/i;
const PROBLEM_KEYWORDS = /\b(problem|pain|issue|challenge|bottleneck|drop-off|slow|inefficient|stuck)\b/i;

function stringifyBriefResponses(briefResponses: Record<string, unknown> | null): string {
  if (!briefResponses) return '';
  const values = Object.values(briefResponses)
    .flatMap((value) => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.map((v) => String(v));
      return [String(value)];
    })
    .filter(Boolean);
  return values.join(' | ');
}

function classifyMode(params: {
  noPublicSite: boolean;
  crawledPageCount: number;
  briefText: string;
}): ReconContextMode {
  const { noPublicSite, crawledPageCount, briefText } = params;
  if (!noPublicSite && crawledPageCount > 0) return 'website_crawl';
  if (!noPublicSite) return 'mixed_limited_data';
  const hasIdea = IDEA_KEYWORDS.test(briefText);
  const hasProblem = PROBLEM_KEYWORDS.test(briefText);
  if (hasIdea && !hasProblem) return 'idea_only';
  if (hasProblem && !hasIdea) return 'problem_only';
  if (hasIdea && hasProblem) return 'mixed_limited_data';
  return 'no_public_website';
}

export function buildReconContextSummary(params: {
  noPublicSite: boolean;
  crawledPageCount: number;
  reconResult: ReconOutput;
  briefResponses: Record<string, unknown> | null;
  hasNewAuditSiteRecon: boolean;
  crawlSignals?: ReconCrawlSignalsForSummary | null;
}): ReconContextSummary {
  const {
    noPublicSite,
    crawledPageCount,
    reconResult,
    briefResponses,
    hasNewAuditSiteRecon,
    crawlSignals = null,
  } = params;
  const briefText = stringifyBriefResponses(briefResponses);
  const mode = classifyMode({ noPublicSite, crawledPageCount, briefText });

  const knownFacts: string[] = [];
  if (reconResult.company_name) knownFacts.push(`Company: ${reconResult.company_name}`);
  if (reconResult.industry) knownFacts.push(`Industry: ${reconResult.industry}`);
  if (reconResult.location) knownFacts.push(`Location: ${reconResult.location}`);
  if (reconResult.business_model) knownFacts.push(`Business model: ${reconResult.business_model}`);
  if (reconResult.target_audience) knownFacts.push(`Target audience: ${reconResult.target_audience}`);
  if (crawledPageCount > 0) knownFacts.push(`Crawled pages: ${crawledPageCount}`);
  if (hasNewAuditSiteRecon) knownFacts.push('Bootstrap site signals available from new-audit prefill');

  const inferredInsights =
    reconResult.initial_observations.length > 0
      ? reconResult.initial_observations.map((text) => ({ text, confidence: 'medium' as const }))
      : [{ text: 'Initial context inferred from intake and available metadata only.', confidence: 'low' as const }];

  const missingInputs: string[] = [];
  if (noPublicSite) missingInputs.push('Public website URL or equivalent digital footprint');
  if (!reconResult.value_proposition) missingInputs.push('Clear value proposition statement');
  if (!reconResult.target_audience) missingInputs.push('Primary target audience details');
  if (reconResult.key_services_products.length === 0) missingInputs.push('Primary products/services list');
  if (crawledPageCount === 0) missingInputs.push('Web evidence (pages, tech stack, public contacts)');

  const recommendedNextSteps: string[] = [];
  if (mode === 'idea_only') {
    recommendedNextSteps.push('Confirm problem statement, ICP, and expected outcome for the first release.');
    recommendedNextSteps.push('Collect baseline constraints: budget, timeline, team capacity.');
  } else if (mode === 'problem_only') {
    recommendedNextSteps.push('Describe current process, bottlenecks, and measurable impact of the problem.');
    recommendedNextSteps.push('Provide existing assets or systems involved in the problem area.');
  } else if (mode === 'no_public_website') {
    recommendedNextSteps.push('Collect evidence artifacts: portfolio, deck, social pages, or app screenshots.');
    recommendedNextSteps.push('Validate core business context before moving into deeper domain scoring.');
  } else if (mode === 'mixed_limited_data') {
    recommendedNextSteps.push('Resolve top missing inputs before approving deeper automation and strategy phases.');
    recommendedNextSteps.push('Capture consultant notes to lock corrected ground truth for downstream phases.');
  } else {
    recommendedNextSteps.push('Validate extracted facts and resolve conflicts at Review Gate #1.');
  }

  const consultant_hints = buildConsultantHints({
    mode,
    noPublicSite,
    crawledPageCount,
    reconResult,
    missingInputs: missingInputs,
    crawlSignals,
  });

  return {
    mode,
    source_labels: noPublicSite
      ? ['intake_brief', 'audit_metadata', ...(hasNewAuditSiteRecon ? ['site_recon_prefill'] : [])]
      : ['crawler', 'intake_brief', 'audit_metadata', ...(hasNewAuditSiteRecon ? ['site_recon_prefill'] : [])],
    known_facts: knownFacts,
    inferred_insights: inferredInsights,
    missing_inputs: missingInputs,
    recommended_next_steps: recommendedNextSteps,
    consultant_hints,
    generated_at: new Date().toISOString(),
  };
}
