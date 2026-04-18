import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IntakePlan } from '@glc/intake-core';

import { IntakeTraceEdgeGraph } from '../IntakeTraceEdgeGraph';

function makePlan(): IntakePlan {
  return {
    eligible: ['a1', 'b1', 'c1'],
    visible: ['a1', 'b1'],
    required: ['a1'],
    hidden: ['c1'],
    deferred: [],
    slaVisibleBankIds: ['a1', 'b1', 'c1'],
    versions: { bankVersion: 'v1', policyVersion: 'v1', resolverVersion: 'v1' },
    derivedFacts: {
      answeredById: {},
      unansweredRequiredCount: 0,
      unansweredRecommendedCount: 0,
      answeredRequiredCount: 0,
      answeredRecommendedCount: 0,
    },
    coverage: {
      requiredAnswered: 0,
      requiredTotal: 0,
      recommendedAnswered: 0,
      recommendedTotal: 0,
      domainCoverage: {},
    },
    confidence: {
      score: 1,
      level: 'high',
      reasons: [],
    },
    missingForReport: [],
    nextRecommended: [],
    reasonsById: {
      a1: [{ layer: 'policy', state: 'required', code: 'base_required' }],
      b1: [{ layer: 'policy', state: 'visible', code: 'visible_by_default' }],
    },
  } as unknown as IntakePlan;
}

describe('IntakeTraceEdgeGraph integration', () => {
  it('renders graph, supports focus and search filtering', () => {
    const onFocusIdChange = vi.fn();
    render(
      <IntakeTraceEdgeGraph
        plan={makePlan()}
        resolveLabel={id => `label_${id}`}
        resolveCanonLabel={id => `canon_${id}?`}
        resolveDraftLabel={id => (id === 'b1' ? 'Other / misc' : null)}
        resolvePublishedLabel={() => null}
        focusId=""
        onFocusIdChange={onFocusIdChange}
      />,
    );

    expect(screen.getByText('Graph view of question branching. Click a node to focus it and inspect dependencies.')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('b1')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Focus question b1'));
    expect(onFocusIdChange).toHaveBeenCalledWith('b1');

    fireEvent.change(screen.getByPlaceholderText('id or text'), { target: { value: 'label_a1' } });
    expect(screen.getByText('a1')).toBeInTheDocument();
  });

  it('shows wording review controls and focuses item from review list', async () => {
    const onFocusIdChange = vi.fn();
    render(
      <IntakeTraceEdgeGraph
        plan={makePlan()}
        resolveLabel={id => `label_${id}`}
        resolveCanonLabel={id => `canon_${id}?`}
        resolveDraftLabel={id => (id === 'b1' ? 'Other / misc' : null)}
        resolvePublishedLabel={() => null}
        focusId=""
        onFocusIdChange={onFocusIdChange}
        showWordingReview
      />,
    );

    expect(await screen.findByText('BA review: wording candidates')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show high severity only' }));
    fireEvent.click(screen.getByRole('button', { name: 'strict' }));
  });
});

