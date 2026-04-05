import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BriefLayoutPreferenceCards } from '../BriefLayoutPreferenceCards';

describe('BriefLayoutPreferenceCards', () => {
  it('calls onSelect with classic when All sections card is activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<BriefLayoutPreferenceCards selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /All sections at once/i }));
    expect(onSelect).toHaveBeenCalledWith('classic');
  });

  it('calls onSelect with wizard when Step by step card is activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<BriefLayoutPreferenceCards selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Step by step/i }));
    expect(onSelect).toHaveBeenCalledWith('wizard');
  });

  it('exposes a labelled group for layout preference', () => {
    render(<BriefLayoutPreferenceCards selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('group', { name: /brief layout preference/i })).toBeInTheDocument();
  });
});
