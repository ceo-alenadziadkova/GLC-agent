import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnrichmentSection } from './EnrichmentSection';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';

describe('EnrichmentSection', () => {
  it('preserves primary answer in base when clearing __other', () => {
    const queueFollowupSave = vi.fn();

    const followupQuestions: BriefQuestion[] = [
      {
        id: 'f5',
        priority: 'optional',
        question: 'Budget range (3–12 months)',
        type: 'single_choice',
        options: [
          'Under €500',
          'No clear budget yet — depends on the recommendations',
        ],
      },
    ];

    const briefResponses: BriefResponses = {};

    render(
      <EnrichmentSection
        id="audit-1"
        domainData={{ status: 'completed' } as never}
        activeDomain="tech_infrastructure"
        followupQuestions={followupQuestions}
        enrichOpen
        setEnrichOpen={() => {}}
        enrichSaved={false}
        briefResponses={briefResponses}
        queueFollowupSave={queueFollowupSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Under €500' }));

    expect(queueFollowupSave).toHaveBeenCalledTimes(2);
    expect(queueFollowupSave).toHaveBeenNthCalledWith(
      1,
      'f5',
      'Under €500',
      'consultant',
      briefResponses,
    );

    const secondCallArgs = queueFollowupSave.mock.calls[1];
    expect(secondCallArgs?.[0]).toBe('f5__other');
    expect(secondCallArgs?.[1]).toBe(null);
    expect(secondCallArgs?.[2]).toBe('consultant');
    expect(secondCallArgs?.[3]).toEqual({
      f5: { value: 'Under €500', source: 'consultant' },
    });
  });

  it('preserves unknown source in base when clearing __other', () => {
    const queueFollowupSave = vi.fn();

    const followupQuestions: BriefQuestion[] = [
      {
        id: 'f5',
        priority: 'optional',
        question: 'Budget range (3–12 months)',
        type: 'single_choice',
        options: [
          'Under €500',
          "I don't know for now",
        ],
      },
    ];

    const briefResponses: BriefResponses = {};

    render(
      <EnrichmentSection
        id="audit-1"
        domainData={{ status: 'completed' } as never}
        activeDomain="tech_infrastructure"
        followupQuestions={followupQuestions}
        enrichOpen
        setEnrichOpen={() => {}}
        enrichSaved={false}
        briefResponses={briefResponses}
        queueFollowupSave={queueFollowupSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: "I don't know for now" }));

    expect(queueFollowupSave).toHaveBeenCalledTimes(2);
    expect(queueFollowupSave).toHaveBeenNthCalledWith(
      1,
      'f5',
      null,
      'unknown',
      briefResponses,
    );

    const secondCallArgs = queueFollowupSave.mock.calls[1];
    expect(secondCallArgs?.[0]).toBe('f5__other');
    expect(secondCallArgs?.[1]).toBe(null);
    expect(secondCallArgs?.[2]).toBe('unknown');
    expect(secondCallArgs?.[3]).toEqual({
      f5: { value: null, source: 'unknown' },
    });
  });
});

