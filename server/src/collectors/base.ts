import { supabase } from '../services/supabase.js';

export interface CollectorResult {
  collector_key: string;
  data: Record<string, unknown>;
}

/**
 * BaseCollector — collects raw data WITHOUT using AI.
 * Results are cached in `collected_data` table for re-runs.
 */
export abstract class BaseCollector {
  abstract get key(): string;
  abstract get phase(): number;

  /**
   * Override this to perform actual data collection.
   */
  abstract collect(auditId: string, companyUrl: string): Promise<Record<string, unknown>>;

  /**
   * Run the collector. Uses cached data if available, otherwise collects fresh.
   */
  async run(auditId: string, companyUrl: string, forceRefresh = false): Promise<CollectorResult> {
    // Check cache first
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('collected_data')
        .select('data')
        .eq('audit_id', auditId)
        .eq('collector_key', this.key)
        .single();

      if (cached) {
        return { collector_key: this.key, data: cached.data };
      }
    }

    // Collect fresh data
    const data = await this.collect(auditId, companyUrl);

    // Cache result (upsert)
    await supabase
      .from('collected_data')
      .upsert(
        { audit_id: auditId, collector_key: this.key, phase: this.phase, data },
        { onConflict: 'audit_id,collector_key' }
      );

    return { collector_key: this.key, data };
  }
}
