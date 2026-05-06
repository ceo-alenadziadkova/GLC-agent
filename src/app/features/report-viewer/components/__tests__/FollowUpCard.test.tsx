import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FollowUpCard } from '../FollowUpCard';

describe('FollowUpCard', () => {
  it('renders follow-up questions with answered status', () => {
    render(
      <FollowUpCard
        followUpQuestions={[
          { id: 'a2', answered: true },
          { id: 'a5', answered: false },
        ]}
        followUpQuestionsCount={2}
        answeredFollowUps={1}
      />,
    );

    expect(screen.getByRole('list', { name: 'Follow-up questions' })).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText("You've answered 1 of 2 follow-up questions.")).toBeInTheDocument();
  });

  it('renders empty state when there are no follow-up questions', () => {
    render(
      <FollowUpCard
        followUpQuestions={[]}
        followUpQuestionsCount={0}
        answeredFollowUps={0}
      />,
    );

    expect(screen.getByText(/No follow-up questions yet/i)).toBeInTheDocument();
  });
});
