import { BaseAgent } from './base.js';
import { CrawlerCollector } from '../collectors/crawler.js';
import { ReconOutputSchema, zodToJsonSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import type { DomainResult } from '../types/audit.js';

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

  get instructions() {
    return `You are a senior IT consultant conducting a reconnaissance analysis of a company's web presence.

Based on the crawled website data provided, analyze and determine:

1. **Company Profile**: Name, industry, sub-category, location, estimated size
2. **Business Model**: What the company does, how it makes money
3. **Target Audience**: Who are their customers
4. **Key Services/Products**: Main offerings
5. **Value Proposition**: What makes them unique
6. **Competitive Landscape**: Any observations about their market position
7. **Mallorca Relevance**: If applicable, how they relate to the Mallorca business ecosystem
8. **Initial Observations**: 3-5 key observations about their digital presence
9. **Interview Questions**: 3-5 questions to ask the company owner for deeper understanding

Be factual — only state what can be inferred from the crawled data. If uncertain, say so.
Use the submit_analysis tool to return your structured analysis.`;
  }

  /**
   * Override run() to save to audit_recon instead of audit_domains.
   */
  async run(): Promise<DomainResult> {
    const companyUrl = await this.getCompanyUrl();

    // Step 1: Collect
    await this.emit('collecting', 'Crawling company website...');
    const crawler = new CrawlerCollector();
    const crawlResult = await crawler.run(this.auditId, companyUrl);
    await this.emit('log', `✓ Crawled ${(crawlResult.data.pages_crawled as unknown[])?.length ?? 0} pages`);

    // Step 2: Assemble context
    await this.emit('assembling_context', 'Preparing analysis context...');
    const context = await this.contextBuilder.build(
      this.auditId, 'recon', { crawler: crawlResult.data }, this.instructions
    );

    // Step 3: Claude call
    await this.emit('analyzing', 'Analyzing company profile...');
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) throw new Error('Token budget exceeded');

    // Use parent's callClaude logic via full run, but we need to handle recon-specific saving
    const prompt = this.contextBuilder.formatPrompt(context);
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        name: 'submit_analysis',
        description: 'Submit the structured reconnaissance analysis',
        input_schema: zodToJsonSchema(ReconOutputSchema) as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
      }],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    });

    await this.tokenTracker.log(this.auditId, 0, {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model: 'claude-sonnet-4-20250514',
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') throw new Error('No tool_use response');

    const reconResult = ReconOutputSchema.parse(toolBlock.input);

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
    };
  }

}
