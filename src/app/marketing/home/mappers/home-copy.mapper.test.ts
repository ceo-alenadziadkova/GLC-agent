import { describe, expect, it } from 'vitest';
import marketingHomeCopy from '../../../data/marketing-home-copy.en.json';
import workspacePackaging from '../../../data/marketing-workspace-packaging.en.json';
import { buildMarketingHomeViewModel } from './home-copy.mapper';

describe('home-copy.mapper', () => {
  it('passes through runtime brand name from context', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.brandName).toBe('Acme Brand');
  });

  it('splits hero headline by configured gradient suffix', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    const source = workspacePackaging.marketing_home.hero;

    expect(vm.hero.headline.full).toBe(source.headline);
    expect(vm.hero.headline.gradientSuffix).toBe(source.headline_gradient_suffix);
    expect(vm.hero.headline.hasGradientSuffix).toBe(true);
    expect(vm.hero.headline.plainBefore).toBe('Bring your business situation');
  });

  it('keeps outcomes shape as primary + secondary cards', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');

    expect(vm.outcomes.primary.title).toBe('Decision pack with execution order');
    expect(vm.outcomes.secondary).toHaveLength(2);
    expect(vm.outcomes.secondary[0]?.title).toBe('Trade-offs and dependencies made explicit');
    expect(vm.outcomes.secondary[1]?.title).toBe('Boundaries documented in plain language');
  });

  it('maps FAQ button label from copy json instead of inline literal', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.faq.allQuestionsLabel).toBe(marketingHomeCopy.faqAllQuestionsLabel);
  });

  it('exposes combined at-a-glance landmark for metrics + trust strip', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.atAGlance.ariaLabel).toBe(marketingHomeCopy.homeAtAGlanceLandmark);
  });

  it('maps scope-truth editorial block from home copy', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.scopeTruth.title).toBe(marketingHomeCopy.homeScopeTruthTitle);
    expect(vm.scopeTruth.body).toBe(marketingHomeCopy.homeScopeTruthBody);
    expect(vm.scopeTruth.expandTriggerLabel).toBe(marketingHomeCopy.homeScopeTruthExpandTriggerLabel);
    expect(vm.scopeTruth.expandBody).toBe(marketingHomeCopy.homeScopeTruthExpandBody);
    expect(vm.scopeTruth.coverageMapHeadingLeft).toBe(marketingHomeCopy.homeScopeTruthCoverageMapHeadingLeft);
    expect(vm.scopeTruth.coverageMapHeadingRight).toBe(marketingHomeCopy.homeScopeTruthCoverageMapHeadingRight);
    expect(vm.scopeTruth.coverageStatusIncludedLabel).toBe(
      marketingHomeCopy.homeScopeTruthCoverageStatusIncludedLabel,
    );
    expect(vm.landmarks.scopeTruth).toBe(workspacePackaging.marketing_home.landmarks.scope_truth);
  });

  it('maps metrics grid label for proof cards landmark', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.trustMetrics.gridLabel).toBe(marketingHomeCopy.homeMetricsGridLabel);
  });
});
