import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RootRedirect } from '../RootRedirect';

describe('RootRedirect', () => {
  const originalSearch = window.location.search;
  const originalHash = window.location.hash;

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', `${window.location.pathname}${originalSearch}${originalHash}`);
  });

  it('navigates to /login when search has code=', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      search: '?code=pkce',
      hash: '',
    } as Location);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<div>Login dest</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login dest')).toBeInTheDocument();
  });

  it('navigates to /dashboard when no callback params', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      search: '',
      hash: '',
    } as Location);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<div>Dashboard dest</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard dest')).toBeInTheDocument();
  });
});
