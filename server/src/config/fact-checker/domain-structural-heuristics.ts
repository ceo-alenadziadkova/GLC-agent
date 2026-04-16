import type { DomainKey } from '../../types/audit.js';
import type { StructuralErrorCode } from '../../schemas/control-object.js';

export const DOMAIN_STRUCTURAL_HEURISTICS: Partial<
  Record<DomainKey, Array<{ code: StructuralErrorCode; needle: string }>>
> = {
  security_compliance: [
    { code: 'security_https_redirect_gap', needle: 'redirect to https' },
    { code: 'security_cookie_flag_gap', needle: 'cookie security issue' },
    { code: 'security_header_hygiene_gap', needle: 'header hygiene issue' },
    { code: 'security_baseline_header_gap', needle: 'baseline security header' },
  ],
  seo_digital: [
    { code: 'seo_missing_crawl_evidence', needle: 'robots.txt has' },
    { code: 'seo_competitor_claim_unverified', needle: 'structured data coverage' },
  ],
  ux_conversion: [
    { code: 'ux_a11y_claim_unchecked', needle: 'missing h1' },
    { code: 'ux_missing_analytics_evidence', needle: 'broken heading hierarchy' },
    { code: 'ux_benchmark_unsubstantiated', needle: 'structured data appears on only' },
  ],
  marketing_utp: [
    { code: 'marketing_market_size_unverified', needle: 'market size claim' },
    { code: 'marketing_competitor_claim_unsourced', needle: 'competitor claim' },
    { code: 'marketing_roi_figure_speculative', needle: 'roi figure appears speculative' },
  ],
  automation_processes: [
    { code: 'automation_time_saving_speculative', needle: 'time-saving estimate appears speculative' },
    { code: 'automation_tool_capability_unverified', needle: 'tool capability claim appears unverified' },
    { code: 'automation_roi_timeline_unrealistic', needle: 'roi timeline' },
  ],
};

