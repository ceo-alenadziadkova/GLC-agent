import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { PlanCommandPalette } from '../PlanCommandPalette';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('../../lib/plan-command-registry', () => ({
  usePlanWorkspacePaletteCommands: () => [
    { id: 'mode-define', label: 'Define', keywords: 'define', run: vi.fn() },
    { id: 'view-board', label: 'Board', keywords: 'board', run: vi.fn() },
    { id: 'filter-lane-seo', label: 'Toggle SEO lane', keywords: 'seo', run: vi.fn() },
    { id: 'surface-move-1', label: 'Move card', keywords: 'move', run: vi.fn() },
    { id: 'compile', label: 'Compile', keywords: 'compile', run: vi.fn() },
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
    expect(screen.getByText(PLAN_WORKSPACE_UI_COPY.commandPaletteGroupLanes)).toBeInTheDocument();
    expect(screen.getByText(PLAN_WORKSPACE_UI_COPY.commandPaletteGroupSurface)).toBeInTheDocument();
  });
});
