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

  it('shows client source badge when entry comes from client', () => {
    const q: BriefQuestion = {
      id: 'q4',
      priority: 'recommended',
      question: 'Client-sourced field',
      type: 'free_text',
    };

    render(
      <BriefField
        q={q}
        value={{ value: 'from client', source: 'client' }}
        onChange={() => {}}
        onSetUnknown={() => {}}
        emphasizeClientSource
      />,
    );

    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('allows clearing unknown state back to editable', () => {
    const q: BriefQuestion = {
      id: 'q5',
      priority: 'required',
      question: 'Unknown answer',
      type: 'free_text',
    };
    const onChange = vi.fn();

    render(
      <BriefField
        q={q}
        value={{ value: null, source: 'unknown' }}
        onChange={onChange}
        onSetUnknown={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /i'll answer myself instead/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('treats unicode dash variants as same single-choice value', () => {
    const q: BriefQuestion = {
      id: 'f5',
      priority: 'optional',
      question: 'Budget range (3–12 months)',
      type: 'single_choice',
      options: ['No clear budget yet — depends on the recommendations'],
    };
    const onChange = vi.fn();

    render(
      <BriefField
        q={q}
        value="No clear budget yet - depends on the recommendations"
        onChange={onChange}
        onSetUnknown={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'No clear budget yet — depends on the recommendations' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('removes selected multi-choice option when apostrophe variant differs', () => {
    const q: BriefQuestion = {
      id: 'x1',
      priority: 'optional',
      question: 'Pick channels',
      type: 'multi_choice',
      options: ["Customer's referrals"],
    };
    const onChange = vi.fn();

    render(
      <BriefField
        q={q}
        value={['Customer’s referrals']}
        onChange={onChange}
        onSetUnknown={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: "Customer's referrals" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
