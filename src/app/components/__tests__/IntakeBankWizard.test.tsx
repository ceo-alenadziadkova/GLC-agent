import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { BriefQuestion } from '../../data/briefQuestions';
import { IntakeBankWizard } from '../IntakeBankWizard';

const mockUseIntakeWizard = vi.fn();

vi.mock('../../hooks/useIntakeWizard', () => ({
  briefResponsesToIntakeMap: (r: Record<string, unknown>) => r,
  useIntakeWizard: (...args: unknown[]) => mockUseIntakeWizard(...args),
}));

vi.mock('../../data/bankQuestionUiCatalog', () => ({
  bankIdToBriefQuestion: (id: string): BriefQuestion => {
    if (id === 'f2') {
      return {
        id: 'f2',
        priority: 'required',
        question: 'Audit focus areas',
        type: 'multi_choice',
        options: [
          'Website performance and technology (speed, stability, technical health)',
          'Marketing and positioning (clarity of message and differentiation)',
        ],
      };
    }
    if (id === 'q2') {
      return {
        id: 'q2',
        priority: 'recommended',
        question: 'Second question',
        type: 'single_choice',
        options: ['X', 'Y'],
      };
    }
    if (id === 'q_text') {
      return {
        id: 'q_text',
        priority: 'required',
        question: 'Describe your goal',
        type: 'free_text',
      };
    }
    return {
      id: 'q1',
      priority: 'required',
      question: 'Pick one option',
      type: 'single_choice',
      options: ['A', 'B'],
    };
  },
}));

function makeWizardState(currentId: string, setResponses = vi.fn()) {
  return {
    responses: {},
    setResponses,
    setField: vi.fn(),
    visibleQuestionStubs: [
      { id: currentId, priority: 'required' as const },
      { id: 'q2', priority: 'recommended' as const },
    ],
    nextRecommended: ['q2'],
    missingForReport: [],
    dataQuality: { score: 0.4, answeredRequired: 1, visibleRequired: 3, answeredRecommended: 0, visibleRecommended: 2 },
    stepIndex: 0,
    setStepIndex: vi.fn(),
    totalSteps: 3,
    currentStub: { id: currentId, priority: 'required' as const },
    goNext: vi.fn(),
    goPrev: vi.fn(),
    goToStep: vi.fn(),
    isFirstStep: false,
    isLastStep: false,
  };
}

describe('IntakeBankWizard', () => {
  beforeEach(() => {
    mockUseIntakeWizard.mockReset();
  });

  it('updates wizard state when switching single-choice option', () => {
    const setResponses = vi.fn();
    mockUseIntakeWizard.mockReturnValue(makeWizardState('q1', setResponses));

    render(<IntakeBankWizard responses={{}} onResponsesChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'B' }));

    expect(setResponses).toHaveBeenCalledTimes(1);
    const updater = setResponses.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    const prev = {
      q1: { value: 'A', source: 'consultant' },
      q1__other: { value: 'old specify', source: 'consultant' },
      legacy_key: { value: 'legacy', source: 'client' },
    };
    const next = updater(prev);
    expect(next.q1).toEqual({ value: 'B', source: 'consultant' });
    expect(next.q1__other).toEqual({ value: null, source: 'consultant' });
    expect(next.legacy_key).toEqual({ value: 'legacy', source: 'client' });
  });

  it('updates wizard state when typing free text', () => {
    const setResponses = vi.fn();
    mockUseIntakeWizard.mockReturnValue(makeWizardState('q_text', setResponses));

    render(<IntakeBankWizard responses={{}} onResponsesChange={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Need more leads' } });

    expect(setResponses).toHaveBeenCalledTimes(1);
    const updater = setResponses.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    const prev = {
      q_text: { value: '', source: 'consultant' },
      q_text__other: { value: 'must-stay', source: 'consultant' },
    };
    const next = updater(prev);
    expect(next.q_text).toEqual({ value: 'Need more leads', source: 'consultant' });
    expect(next.q_text__other).toEqual({ value: 'must-stay', source: 'consultant' });
  });

  it('renders Suggested next block below current question', () => {
    mockUseIntakeWizard.mockReturnValue(makeWizardState('q1'));

    render(<IntakeBankWizard responses={{}} onResponsesChange={() => {}} />);
    const question = screen.getByText('Pick one option');
    const suggested = screen.getByText('Suggested next');

    const position = question.compareDocumentPosition(suggested);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('locks express-only excluded focus areas for f2', () => {
    const setResponses = vi.fn();
    mockUseIntakeWizard.mockReturnValue(makeWizardState('f2', setResponses));

    render(<IntakeBankWizard responses={{}} onResponsesChange={() => {}} productMode="express" />);

    const lockedOption = screen.getByRole('button', {
      name: 'Marketing and positioning (clarity of message and differentiation)',
    });
    expect(lockedOption).toBeDisabled();
    fireEvent.click(lockedOption);
    expect(setResponses).not.toHaveBeenCalled();
    expect(
      screen.getByText(/In Pro coverage, deep analysis focuses on selected domains/i),
    ).toBeInTheDocument();
  });
});
