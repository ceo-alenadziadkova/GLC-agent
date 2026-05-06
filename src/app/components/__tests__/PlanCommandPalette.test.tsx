import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PlanCommandPalette } from '../PlanCommandPalette';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('../../lib/plan-command-registry', () => ({
  usePlanWorkspacePaletteCommands: () => [
    {
      id: 'mode-define',
      label: 'Define',
      keywords: 'define',
      run: vi.fn(),
    },
  ],
}));

describe('PlanCommandPalette', () => {
  it('opens on meta+k when commands are available', async () => {
    render(
      <MemoryRouter initialEntries={['/plan/audit-palette']}>
        <Routes>
          <Route path="/plan/:id" element={<PlanCommandPalette />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: 'k', metaKey: true, ctrlKey: false });
    await waitFor(() => {
      expect(screen.getByText('Define')).toBeInTheDocument();
    });
  });
});
