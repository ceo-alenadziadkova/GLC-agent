import { describe, expect, it } from 'vitest';
import { createControlObjectV1 } from '../schemas/control-object.js';
import { dynamicAdjustmentService } from '../services/dynamic-adjustment.js';

describe('DynamicAdjustmentService — security routing', () => {
  it('maps new security structural codes to agent 2 patches', () => {
    const co = createControlObjectV1('audit-security-adjust', 'security_compliance');
    co.errors.structural = [
      'security_https_redirect_gap',
      'security_cookie_flag_gap',
      'security_header_hygiene_gap',
      'security_baseline_header_gap',
    ];

    const out = dynamicAdjustmentService.generateAdjustments(co);

    expect(out.matched_error_types).toEqual(expect.arrayContaining([
      'security_https_redirect_gap',
      'security_cookie_flag_gap',
      'security_header_hygiene_gap',
      'security_baseline_header_gap',
    ]));
    expect(out.unmatched_error_types).toEqual([]);

    const secPatch = out.adjustments.get(2);
    expect(secPatch).toBeDefined();
    expect(secPatch).toContain('[Correction for security_https_redirect_gap]');
    expect(secPatch).toContain('[Correction for security_cookie_flag_gap]');
    expect(secPatch).toContain('[Correction for security_header_hygiene_gap]');
    expect(secPatch).toContain('[Correction for security_baseline_header_gap]');

    // Security-specific codes should not spill into unrelated agents.
    expect(out.adjustments.get(1)).toBeUndefined();
    expect(out.adjustments.get(3)).toBeUndefined();
  });
});

describe('DynamicAdjustmentService — SEO routing', () => {
  it('maps SEO structural codes to agent 3 patches', () => {
    const co = createControlObjectV1('audit-seo-adjust', 'seo_digital');
    co.errors.structural = [
      'seo_missing_crawl_evidence',
      'seo_competitor_claim_unverified',
    ];

    const out = dynamicAdjustmentService.generateAdjustments(co);

    expect(out.matched_error_types).toEqual(expect.arrayContaining([
      'seo_missing_crawl_evidence',
      'seo_competitor_claim_unverified',
    ]));
    expect(out.unmatched_error_types).toEqual([]);

    const seoPatch = out.adjustments.get(3);
    expect(seoPatch).toBeDefined();
    expect(seoPatch).toContain('[Correction for seo_missing_crawl_evidence]');
    expect(seoPatch).toContain('[Correction for seo_competitor_claim_unverified]');

    expect(out.adjustments.get(2)).toBeUndefined();
  });
});

describe('DynamicAdjustmentService — UX routing', () => {
  it('maps UX structural codes to agent 4 patches', () => {
    const co = createControlObjectV1('audit-ux-adjust', 'ux_conversion');
    co.errors.structural = [
      'ux_a11y_claim_unchecked',
      'ux_missing_analytics_evidence',
      'ux_benchmark_unsubstantiated',
    ];

    const out = dynamicAdjustmentService.generateAdjustments(co);

    expect(out.matched_error_types).toEqual(expect.arrayContaining([
      'ux_a11y_claim_unchecked',
      'ux_missing_analytics_evidence',
      'ux_benchmark_unsubstantiated',
    ]));
    expect(out.unmatched_error_types).toEqual([]);

    const uxPatch = out.adjustments.get(4);
    expect(uxPatch).toBeDefined();
    expect(uxPatch).toContain('[Correction for ux_a11y_claim_unchecked]');
    expect(uxPatch).toContain('[Correction for ux_missing_analytics_evidence]');
    expect(uxPatch).toContain('[Correction for ux_benchmark_unsubstantiated]');

    expect(out.adjustments.get(3)).toBeUndefined();
  });
});

describe('DynamicAdjustmentService — Marketing and Automation routing', () => {
  it('maps marketing structural codes to agent 5 patches', () => {
    const co = createControlObjectV1('audit-mkt-adjust', 'marketing_utp');
    co.errors.structural = [
      'marketing_market_size_unverified',
      'marketing_competitor_claim_unsourced',
      'marketing_roi_figure_speculative',
    ];

    const out = dynamicAdjustmentService.generateAdjustments(co);
    const patch = out.adjustments.get(5);

    expect(out.matched_error_types).toEqual(expect.arrayContaining([
      'marketing_market_size_unverified',
      'marketing_competitor_claim_unsourced',
      'marketing_roi_figure_speculative',
    ]));
    expect(patch).toBeDefined();
    expect(patch).toContain('[Correction for marketing_market_size_unverified]');
    expect(patch).toContain('[Correction for marketing_competitor_claim_unsourced]');
    expect(patch).toContain('[Correction for marketing_roi_figure_speculative]');
  });

  it('maps automation structural codes to agent 6 patches', () => {
    const co = createControlObjectV1('audit-auto-adjust', 'automation_processes');
    co.errors.structural = [
      'automation_time_saving_speculative',
      'automation_tool_capability_unverified',
      'automation_roi_timeline_unrealistic',
    ];

    const out = dynamicAdjustmentService.generateAdjustments(co);
    const patch = out.adjustments.get(6);

    expect(out.matched_error_types).toEqual(expect.arrayContaining([
      'automation_time_saving_speculative',
      'automation_tool_capability_unverified',
      'automation_roi_timeline_unrealistic',
    ]));
    expect(patch).toBeDefined();
    expect(patch).toContain('[Correction for automation_time_saving_speculative]');
    expect(patch).toContain('[Correction for automation_tool_capability_unverified]');
    expect(patch).toContain('[Correction for automation_roi_timeline_unrealistic]');
  });
});
