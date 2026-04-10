import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';
import * as clientLogger from '../../lib/logger';

beforeEach(() => {
  vi.spyOn(clientLogger.logger, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test error message');
  return <div>OK</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows neutral error UI without exposing raw exception text', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('test error message')).not.toBeInTheDocument();
    expect(screen.getByText(/Reference:/)).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('"Try again" button is present and resets error state', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    const btn = screen.getByRole('button', { name: /try again/i });
    expect(btn).toBeInTheDocument();

    // Clicking retry resets hasError → Bomb renders again → throws again
    // (because shouldThrow is still true) → error UI reappears
    await user.click(btn);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
