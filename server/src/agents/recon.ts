import { BaseAgent, loadPrompt } from './base.js';
import { CrawlerCollector } from '../collectors/crawler.js';
import { ReconOutputSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import { isNoPublicWebsiteUrl } from '../config/no-public-website.js';
import type { DomainResult } from '../types/audit.js';
import { writeReconPrefillsAfterPhase0 } from '../services/recon-prefill.js';

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
    const companyUrl = await this.getCompanyUrl();
    const noPublicSite = isNoPublicWebsiteUrl(companyUrl);

    // Step 1: Collect
    await this.emit(
      'collecting',
      noPublicSite ? 'No public website — skipping web crawl...' : 'Crawling company website...'
    );
    const crawler = new CrawlerCollector();
    const crawlResult = await crawler.run(this.auditId, companyUrl);
    const crawledPageCount = (crawlResult.data.pages_crawled as unknown[])?.length ?? 0;
    await this.emit(
      'log',
      noPublicSite
        ? '✓ No public website — recon will use intake brief and form data only'
        : `✓ Crawled ${crawledPageCount} pages`
    );

    if (!noPublicSite && crawledPageCount === 0) {
      const msg = 'Recon crawled 0 pages — site may be unreachable or blocking crawlers';
      await this.emit('phase-error', msg, { phase: 'recon', fatal: true, timestamp: new Date().toISOString() });
      throw new Error(msg);
    }

    // Step 2: Assemble context
    await this.emit('assembling_context', 'Preparing analysis context...');
    const context = await this.contextBuilder.build(
      this.auditId, 'recon', { crawler: crawlResult.data }, this.instructions
    );

    // Step 3: Claude call
    await this.emit('analyzing', 'Analyzing company profile...');
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) throw new Error('Token budget exceeded');
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(`Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`);
    }
    if (budget.is_approaching_limit) {
      await this.emit('warning', `Token budget at ${Math.round((budget.tokens_used / budget.token_budget) * 100)}% — ${budget.remaining} tokens remaining`);
    }

    const reconResult = await this.callClaudeWithRetry(context, ReconOutputSchema, MODEL_MAX_TOKENS.recon) as unknown as import('zod').infer<typeof ReconOutputSchema>;

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

    await this.emit('completed', 'Reconnaissance complete', {
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
