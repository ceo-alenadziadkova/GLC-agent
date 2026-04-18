import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { IntakeVersionTuple } from '../../../data/auditTypes';

const {
  getUiFragmentMock,
  setDiscoveryUiFragmentQuestionsMock,
} = vi.hoisted(() => ({
  getUiFragmentMock: vi.fn(),
  setDiscoveryUiFragmentQuestionsMock: vi.fn(),
}));

vi.mock('../../../data/api/discover', () => ({
  discoverApi: {
    getUiFragment: getUiFragmentMock,
  },
}));

vi.mock('../../../lib/discovery-flow', () => ({
  setDiscoveryUiFragmentQuestions: setDiscoveryUiFragmentQuestionsMock,
}));

import { useDiscoveryUiFragment } from './useDiscoveryUiFragment';

describe('useDiscoveryUiFragment', () => {
  beforeEach(() => {
    getUiFragmentMock.mockReset();
    setDiscoveryUiFragmentQuestionsMock.mockReset();
  });

  it('fetches ui fragment once even when callback identity changes', async () => {
    const intakeVersions: IntakeVersionTuple = {
      questionBankVersion: 'qb-v1',
      policyVersion: 'policy-v1',
      layoutVersion: 'layout-v1',
      resolverVersion: 'resolver-v1',
    };

    getUiFragmentMock.mockResolvedValue({
      questions: [{ id: 'a1', question: 'Q1', type: 'single_choice', options: ['One'] }],
      intake_versions: intakeVersions,
    });

    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ onIntakeVersionsResolved }: { onIntakeVersionsResolved: (versions: IntakeVersionTuple) => void }) =>
        useDiscoveryUiFragment({ onIntakeVersionsResolved }),
      {
        initialProps: { onIntakeVersionsResolved: firstCallback },
      },
    );

    rerender({ onIntakeVersionsResolved: secondCallback });

    await waitFor(() => {
      expect(getUiFragmentMock).toHaveBeenCalledTimes(1);
    });

    expect(setDiscoveryUiFragmentQuestionsMock).toHaveBeenCalledTimes(1);
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledWith(intakeVersions);
  });
});
