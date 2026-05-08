import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlanWorkspaceManifestStatePill } from '../PlanWorkspaceManifestStatePill';

describe('PlanWorkspaceManifestStatePill', () => {
  it('exposes tone-specific test id and polite live region for manifest state', () => {
    const { rerender } = render(
      <PlanWorkspaceManifestStatePill tone="dirty" label="Unsaved" srLabel="Manifest has drift" />,
    );
    const root = screen.getByTestId('plan-manifest-state-pill-dirty');
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(screen.getByText('Manifest has drift')).toHaveClass('sr-only');

    rerender(<PlanWorkspaceManifestStatePill tone="saved" label="Saved" />);
    expect(screen.getByTestId('plan-manifest-state-pill-saved')).toBeInTheDocument();

    rerender(<PlanWorkspaceManifestStatePill tone="pending" label="Compiling" />);
    expect(screen.getByTestId('plan-manifest-state-pill-pending')).toBeInTheDocument();
  });
});
