import {
  REPORT_PROFILE_LABELS,
  REPORT_PROFILES,
  type ReportProfile,
} from '@glc/intake-core';
import { buildCoverage } from './domain/coverage.js';
import { filterDomainsByProfile } from './domain/profile-domain-filter.js';
import { buildCsvActionPlan } from './formatters/csv/csv-builder.js';
import {
  buildFocusedByProfile,
  buildFullReport,
  buildOnePagerReport,
  buildOwnerReport,
} from './formatters/markdown/builders.js';
import { buildIdeaStageReadiness } from './domain/idea-stage-readiness.js';
import type { MarkdownReport, ReportInput } from './types.js';

export type { ReportProfile } from './types.js';
export { REPORT_PROFILES };
export const PROFILE_LABELS = REPORT_PROFILE_LABELS;

export class ReportProfiler {
  generate(input: ReportInput, profile: ReportProfile = 'full'): MarkdownReport {
    const company = input.recon?.company_name ?? input.audit.company_url;
    const generated_at = new Date().toISOString();
    const filteredDomains = filterDomainsByProfile(input.domains, profile);
    const coverage = buildCoverage(input);
    const ideaStageReadiness = buildIdeaStageReadiness(input);

    const markdown = this.buildMarkdownByProfile(input, profile, company, filteredDomains, coverage, ideaStageReadiness);

    return {
      profile,
      profile_label: PROFILE_LABELS[profile],
      company,
      generated_at,
      markdown,
      coverage,
      ...(ideaStageReadiness ? { idea_stage_readiness: ideaStageReadiness } : {}),
    };
  }

  generateCsv(input: ReportInput): string {
    return buildCsvActionPlan(input);
  }

  private buildMarkdownByProfile(
    input: ReportInput,
    profile: ReportProfile,
    company: string,
    filteredDomains: ReportInput['domains'],
    coverage: MarkdownReport['coverage'],
    ideaStageReadiness?: MarkdownReport['idea_stage_readiness'],
  ): string {
    switch (profile) {
      case 'onepager':
        return buildOnePagerReport(input, filteredDomains, company, coverage, ideaStageReadiness);
      case 'owner':
        return buildOwnerReport(input, company, coverage, ideaStageReadiness);
      case 'tech':
        return buildFocusedByProfile(input, filteredDomains, company, coverage, 'tech', ideaStageReadiness);
      case 'marketing':
        return buildFocusedByProfile(input, filteredDomains, company, coverage, 'marketing', ideaStageReadiness);
      default:
        return buildFullReport(input, input.domains, company, coverage, ideaStageReadiness);
    }
  }
}

export const reportProfiler = new ReportProfiler();
