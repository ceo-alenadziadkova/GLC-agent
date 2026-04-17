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
    expect(vm.hero.headline.plainBefore).toBe('One place where your business context turns into');
  });

  it('keeps outcomes shape as primary + secondary cards', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');

    expect(vm.outcomes.primary.title).toBe('Shared picture');
    expect(vm.outcomes.secondary).toHaveLength(2);
    expect(vm.outcomes.secondary[0]?.title).toBe('Priority roadmap');
    expect(vm.outcomes.secondary[1]?.title).toBe('Clear scope');
  });

  it('maps FAQ button label from copy json instead of inline literal', () => {
    const vm = buildMarketingHomeViewModel('Acme Brand');
    expect(vm.faq.allQuestionsLabel).toBe(marketingHomeCopy.faqAllQuestionsLabel);
  });
});
