import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BriefField } from '../BriefField';
import type { BriefQuestion } from '../../data/briefQuestions';

describe('BriefField interactions', () => {
  it('allows switching single-choice selection', () => {
    const q: BriefQuestion = {
      id: 'q1',
      priority: 'required',
      question: 'Choose one',
      type: 'single_choice',
      options: ['A', 'B'],
    };
    const onChange = vi.fn();

    render(
      <BriefField
        q={q}
        value="A"
        onChange={onChange}
        onSetUnknown={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('blocks disabled options and keeps them non-interactive', () => {
    const q: BriefQuestion = {
      id: 'f2',
      priority: 'required',
      question: 'Audit focus areas',
      type: 'multi_choice',
      options: [
        'Website performance and technology (speed, stability, technical health)',
        'Marketing and positioning (clarity of message and differentiation)',
      ],
    };
    const onChange = vi.fn();

    render(
      <BriefField
        q={q}
        value={[]}
        onChange={onChange}
        onSetUnknown={() => {}}
        disabledOptions={['Marketing and positioning (clarity of message and differentiation)']}
        productMode="express"
      />,
    );

    const lockedButton = screen.getByRole('button', {
      name: 'Marketing and positioning (clarity of message and differentiation)',
    });
    expect(lockedButton).toBeDisabled();
    fireEvent.click(lockedButton);
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(/In Pro coverage, deep analysis focuses on selected domains/i),
    ).toBeInTheDocument();
  });

  it('allows typing in free-text field', () => {
    const q: BriefQuestion = {
      id: 'q2',
      priority: 'required',
      question: 'Describe your goal',
      type: 'free_text',
    };

    function Wrapper() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <BriefField
          q={q}
          value={value}
          onChange={v => setValue((v as string | null) ?? null)}
          onSetUnknown={() => {}}
        />
      );
    }

    render(<Wrapper />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test input' } });
    expect(input).toHaveValue('Test input');
  });

  it('allows typing clarify text for Other option', () => {
    const q: BriefQuestion = {
      id: 'q3',
      priority: 'required',
      question: 'Industry',
      type: 'single_choice',
      options: ['Other', 'SaaS'],
    };

    function Wrapper() {
      const [otherSpecify, setOtherSpecify] = useState('');
      return (
        <BriefField
          q={q}
          value="Other"
          onChange={() => {}}
          onSetUnknown={() => {}}
          otherSpecify={otherSpecify}
          onOtherSpecifyChange={setOtherSpecify}
        />
      );
    }

    render(<Wrapper />);
    const specify = screen.getByPlaceholderText('Add one short clarification...');
    fireEvent.change(specify, { target: { value: 'Boutique hotel' } });
    expect(specify).toHaveValue('Boutique hotel');
  });
});
