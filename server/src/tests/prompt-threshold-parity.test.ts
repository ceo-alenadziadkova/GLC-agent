import { describe, expect, it } from 'vitest';

import { FACT_CHECKER_THRESHOLDS } from '../config/fact-checker-thresholds.js';
import { loadPrompt } from '../agents/base/prompt-loader.js';

describe('prompt threshold parity', () => {
  it('keeps strategy initiative count ranges aligned with schema contract', () => {
    const strategyPrompt = loadPrompt('strategy');
    expect(strategyPrompt).toContain('Quick Wins** (2-6 items');
    expect(strategyPrompt).toContain('Medium-Term Initiatives** (2-6 items');
    expect(strategyPrompt).toContain('Strategic Investments** (1-4 items');
  });

  it('includes tech load-time threshold from FactChecker', () => {
    const techPrompt = loadPrompt('tech_infrastructure');
    expect(techPrompt).toContain(`avg_load_time_ms > ${FACT_CHECKER_THRESHOLDS.tech.maxAvgLoadTimeMs}`);
  });

  it('includes SEO coverage thresholds from FactChecker', () => {
    const seoPrompt = loadPrompt('seo_digital');
    expect(seoPrompt).toContain(`${FACT_CHECKER_THRESHOLDS.seo.metaDescriptionMinCoverage * 100}%`);
    expect(seoPrompt).toContain(`${FACT_CHECKER_THRESHOLDS.seo.minStructuredDataCoverage * 100}%`);
  });

  it('includes UX alt coverage threshold from FactChecker', () => {
    const uxPrompt = loadPrompt('ux_conversion');
    expect(uxPrompt).toContain(`below ${FACT_CHECKER_THRESHOLDS.ux.imageAltMinCoveragePercent}%`);
  });
});
