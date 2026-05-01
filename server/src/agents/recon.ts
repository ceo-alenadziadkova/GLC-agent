import { BaseAgent, loadPrompt } from './base.js';
import { CrawlerCollector } from '../collectors/crawler.js';
import { ReconOutputSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import {
  interpolatePipelineEventMessage,
  pipelineReconEventCopy,
} from '../config/pipeline-events-copy.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import type { DomainResult } from '../types/audit.js';
import { writeReconPrefillsAfterPhase0 } from '../services/recon-prefill.js';
import { loadNewAuditSiteReconData } from '../services/audits/new-audit-site-scrape.service.js';
import {
  buildReconContextSummary,
  extractReconCrawlSignalsForSummary,
} from '../services/recon/recon-context-summary.service.js';

/**
 * Phase 0: Recon Agent
 * Crawls the company website and uses Claude to interpret the collected data
 * into a structured company profile.
 */
export class ReconAgent extends BaseAgent {
  get phaseNumber() { return 0; }
  get domainKey() { return 'recon' as const; }
  get collectors() { return [new CrawlerCollector()]; }
  get outputSchema() { return ReconOutputSchema; }

  get instructions() { return loadPrompt('recon'); }

  /**
   * Override run() to save to audit_recon instead of audit_domains.
   */
  async run(): Promise<DomainResult> {
    const { companyUrl, noPublicWebsite } = await this.getAuditWebContext();
    const noPublicSite = auditSkipsPublicWebsiteFetches(noPublicWebsite, companyUrl);
    const ev = pipelineReconEventCopy();

    // Step 1: Collect
    await this.emit(
      'collecting',
      noPublicSite ? ev.collectingNoPublicSite : ev.collectingWithCrawl,
    );
    const crawler = new CrawlerCollector();
    const crawlResult = await crawler.run(this.auditId, companyUrl, { noPublicWebsite });
    const newAuditSiteRecon = await loadNewAuditSiteReconData(this.auditId);
    const crawledPageCount = (crawlResult.data.pages_crawled as unknown[])?.length ?? 0;
    await this.emit(
      'log',
      noPublicSite
        ? ev.logNoPublicSite
        : interpolatePipelineEventMessage(ev.logAfterCrawl, { count: crawledPageCount }),
    );

    if (!noPublicSite && crawledPageCount === 0) {
      const msg = ev.phaseErrorZeroPages;
      await this.emit('phase-error', msg, { phase: 'recon', fatal: true, timestamp: new Date().toISOString() });
      throw new Error(msg);
    }

    // Step 2: Assemble context
    await this.emit('assembling_context', ev.assemblingContext);
    const context = await this.contextBuilder.build(this.auditId, 'recon', {
      crawler: crawlResult.data,
      ...(newAuditSiteRecon ? { new_audit_site_recon: newAuditSiteRecon } : {}),
    }, this.instructions);

    // Step 3: Claude call
    await this.emit('analyzing', ev.analyzing);
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) throw new Error('Token budget exceeded');
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(`Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`);
    }
    if (budget.is_approaching_limit) {
      await this.emit(
        'warning',
        interpolatePipelineEventMessage(ev.tokenBudgetWarning, {
          pct: Math.round((budget.tokens_used / budget.token_budget) * 100),
          remaining: budget.remaining,
        }),
      );
    }

    const reconResult = await this.callClaudeWithRetry(context, ReconOutputSchema, MODEL_MAX_TOKENS.recon) as unknown as import('zod').infer<typeof ReconOutputSchema>;
    const { data: briefRow } = await supabase
      .from('intake_brief')
      .select('responses')
      .eq('audit_id', this.auditId)
      .maybeSingle();
    const briefResponses =
      briefRow && typeof briefRow.responses === 'object' && briefRow.responses && !Array.isArray(briefRow.responses)
        ? (briefRow.responses as Record<string, unknown>)
        : null;
    const crawlSignals = extractReconCrawlSignalsForSummary({
      tech_stack: crawlResult.data.tech_stack as Record<string, unknown> | undefined,
      social_profiles: crawlResult.data.social_profiles as Record<string, unknown> | undefined,
      contact_info: crawlResult.data.contact_info,
    });

    const reconContextSummary = buildReconContextSummary({
      noPublicSite,
      crawledPageCount,
      reconResult,
      briefResponses,
      hasNewAuditSiteRecon: Boolean(newAuditSiteRecon),
      crawlSignals,
    });

    // Save to audit_recon
    await supabase.from('audit_recon').update({
      status: 'completed',
      company_name: reconResult.company_name,
      industry: reconResult.industry,
      location: reconResult.location,
      languages: crawlResult.data.languages_detected,
      tech_stack: crawlResult.data.tech_stack,
      social_profiles: crawlResult.data.social_profiles,
      contact_info: crawlResult.data.contact_info,
      pages_crawled: crawlResult.data.pages_crawled,
      recon_context_summary: reconContextSummary,
    }).eq('audit_id', this.auditId);

    if (!noPublicSite) {
      await writeReconPrefillsAfterPhase0(
        this.auditId,
        (crawlResult.data.tech_stack ?? {}) as Record<string, unknown>,
      );
    }

    // Update audit with discovered info
    await supabase.from('audits').update({
      company_name: reconResult.company_name ?? undefined,
      industry: reconResult.industry ?? undefined,
      status: 'review',
      current_phase: 0,
    }).eq('id', this.auditId);

    await this.emit('completed', ev.completed, {
      company_name: reconResult.company_name,
      industry: reconResult.industry,
      pages_crawled: (crawlResult.data.pages_crawled as unknown[])?.length ?? 0,
    });

    // Return as DomainResult shape for compatibility
    return {
      score: 0,
      label: 'Recon',
      summary: reconResult.initial_observations?.join('. ') ?? '',
      strengths: reconResult.key_services_products ?? [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }

}
