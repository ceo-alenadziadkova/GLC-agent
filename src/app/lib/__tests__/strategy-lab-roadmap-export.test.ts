import { describe, expect, it } from 'vitest';

import { buildStrategyLabRoadmapMarkdown } from '../strategy-lab-roadmap-export';
import type { StrategyInitiative } from '../../data/auditTypes';

const labels = {
  title: 'Prioritised transformation roadmap',
  companyLabel: 'Company',
  urlLabel: 'URL',
  auditIdLabel: 'Audit ID',
  generatedOnLabel: 'Generated',
  executiveSummaryHeading: 'Executive summary',
  selectedHeading: 'Selected initiatives',
  sectionLabels: {
    quick: 'Quick Wins',
    medium: 'Core Growth',
    strategic: 'Strategic',
  },
  impactLabel: 'Impact',
  effortLabel: 'Effort',
  dependenciesLabel: 'Dependencies',
  missingFieldValue: '—',
} as const;

function init(partial: Partial<StrategyInitiative> & Pick<StrategyInitiative, 'id' | 'title'>): StrategyInitiative {
  return {
    description: '',
    impact: 'medium',
    effort: 'medium',
    ...partial,
  };
}

describe('buildStrategyLabRoadmapMarkdown', () => {
  it('includes metadata, summary, and grouped initiatives', () => {
    const md = buildStrategyLabRoadmapMarkdown({
      ...labels,
      companyName: 'Acme',
      companyUrl: 'https://acme.example',
      auditId: 'audit-1',
      executiveSummary: 'Ship faster.',
      selectedByTimeframe: {
        quick: [init({ id: 'a', title: 'Fix forms', description: 'Reduce drop-off.', impact: 'high', effort: 'low' })],
        medium: [],
        strategic: [
          init({
            id: 'b',
            title: 'Platform',
            description: 'Consolidate.',
            impact: 'low',
            effort: 'high',
            dependencies: ['a'],
          }),
        ],
      },
    });

    expect(md).toContain('# Prioritised transformation roadmap');
    expect(md).toContain('**Company:** Acme');
    expect(md).toContain('https://acme.example');
    expect(md).toContain('**Audit ID:** audit-1');
    expect(md).toContain('## Executive summary');
    expect(md).toContain('Ship faster.');
    expect(md).toContain('### Quick Wins');
    expect(md).toContain('### Fix forms');
    expect(md).toContain('### Strategic');
    expect(md).toContain('### Platform');
    expect(md).toContain('**Dependencies:** a');
    expect(md).not.toContain('### Core Growth');
  });

  it('does not throw when initiative description is missing', () => {
    const naked = init({ id: 'nd', title: 'No description field' }) as StrategyInitiative;
    Reflect.deleteProperty(naked, 'description');
    expect(() =>
      buildStrategyLabRoadmapMarkdown({
        ...labels,
        companyName: 'Co',
        companyUrl: '',
        auditId: 'audit-nd',
        executiveSummary: null,
        selectedByTimeframe: {
          quick: [naked],
          medium: [],
          strategic: [],
        },
      }),
    ).not.toThrow();
    const md = buildStrategyLabRoadmapMarkdown({
      ...labels,
      companyName: 'Co',
      companyUrl: '',
      auditId: 'audit-nd',
      executiveSummary: null,
      selectedByTimeframe: {
        quick: [naked],
        medium: [],
        strategic: [],
      },
    });
    expect(md).toContain('### No description field');
    expect(md).toContain('- **Impact:** medium');
  });

  it('omits executive summary section when empty', () => {
    const md = buildStrategyLabRoadmapMarkdown({
      ...labels,
      companyName: null,
      companyUrl: '',
      auditId: 'x',
      executiveSummary: null,
      selectedByTimeframe: {
        quick: [],
        medium: [init({ id: 'm', title: 'Mid', description: 'D' })],
        strategic: [],
      },
    });
    expect(md).not.toContain('## Executive summary');
    expect(md).toContain('### Core Growth');
    expect(md).toContain('**Company:** —');
    expect(md).toContain('**URL:** —');
  });
});
