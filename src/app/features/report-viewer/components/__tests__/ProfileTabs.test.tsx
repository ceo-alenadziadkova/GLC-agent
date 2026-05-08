import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReportProfile } from '@glc/intake-core';
import { ProfileTabs } from '../ProfileTabs';

const onSelectMock = vi.fn();

describe('ProfileTabs', () => {
  it('renders fallback status when profile options are unavailable', () => {
    render(<ProfileTabs options={[]} profile={'full' as ReportProfile} onSelect={onSelectMock} />);

    expect(screen.getByRole('status')).toHaveTextContent('Profiles are unavailable right now. Try again in a moment.');
  });

  it('handles Home and End keyboard navigation safely', () => {
    render(
      <ProfileTabs
        options={[
          { id: 'full', label: 'Full', description: 'All domains', icon: () => null },
          { id: 'tech', label: 'Tech', description: 'Technical view', icon: () => null },
          { id: 'marketing', label: 'Marketing', description: 'Marketing view', icon: () => null },
        ]}
        profile={'tech' as ReportProfile}
        onSelect={onSelectMock}
      />,
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Tech' }), { key: 'Home' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Tech' }), { key: 'End' });

    expect(onSelectMock).toHaveBeenNthCalledWith(1, 'full');
    expect(onSelectMock).toHaveBeenNthCalledWith(2, 'marketing');
  });
});
