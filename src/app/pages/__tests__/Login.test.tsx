import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { User, Session } from '@supabase/supabase-js';
import { Login } from '../Login';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', async importOriginal => {
  const actual = await importOriginal<typeof import('../../hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});
vi.mock('../../components/ThemeToggle', () => ({
  ThemeToggle: () => null,
}));
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);

const navigate = vi.fn();

vi.mock('react-router', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router')>();
  return {
    ...mod,
    useNavigate: () => navigate,
  };
});

const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
const signUpWithPassword = vi.fn().mockResolvedValue({ error: null });
const signInWithGoogle = vi.fn().mockResolvedValue({ error: null });

const AUTH_BASE = {
  session: null as Session | null,
  loading: false,
  authError: null as string | null,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  signOut: vi.fn(),
};

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPassword.mockResolvedValue({ error: null });
  signUpWithPassword.mockResolvedValue({ error: null });
  signInWithGoogle.mockResolvedValue({ error: null });
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function stubLocation(search: string, hash = '') {
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    search,
    hash,
    href: `http://localhost${search}${hash}`,
  } as Location);
}

function getEmailPasswordSubmitButton(): HTMLElement {
  const el = document.querySelector('form button[type="submit"]');
  if (!el) throw new Error('Expected form submit button');
  return el as HTMLElement;
}

describe('Login', () => {
  it('stores discovery token from query string on mount', () => {
    stubLocation('?discovery=disc-xyz');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin('/login?discovery=disc-xyz');

    expect(localStorage.getItem('glc_discovery_token')).toBe('disc-xyz');
  });

  it('navigates to audit new when authenticated with discovery token', async () => {
    localStorage.setItem('glc_discovery_token', 't1');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', email: 'a@a.com', identities: [{ provider: 'email' }] } as User,
    });

    renderLogin();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/audit/new?from_discovery=1', { replace: true });
    });
  });

  it('navigates to next when query param is safe relative path', async () => {
    stubLocation('?next=%2Fdashboard');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', email: 'a@a.com', identities: [{ provider: 'email' }] } as User,
    });

    renderLogin('/login?next=%2Fdashboard');

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('navigates to /portfolio by default when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', email: 'a@a.com', identities: [{ provider: 'email' }] } as User,
    });

    renderLogin();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/portfolio', { replace: true });
    });
  });

  it('does not navigate away for anonymous user (upgrade path)', async () => {
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', is_anonymous: true } as User,
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText(/quick site scan/i)).toBeInTheDocument();
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows mode toggles and Google CTA', () => {
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('prefers discovery redirect over ?next= when both are set', async () => {
    localStorage.setItem('glc_discovery_token', 'disc-1');
    stubLocation('?next=%2Fdashboard');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', email: 'a@a.com', identities: [{ provider: 'email' }] } as User,
    });

    renderLogin('/login?next=%2Fdashboard');

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/audit/new?from_discovery=1', { replace: true });
    });
    expect(navigate).not.toHaveBeenCalledWith('/dashboard', expect.anything());
  });

  it('ignores open-redirect style ?next= (//…) and falls back to /portfolio', async () => {
    stubLocation('?next=%2F%2Fevil.example');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: true,
      user: { id: 'u1', email: 'a@a.com', identities: [{ provider: 'email' }] } as User,
    });

    renderLogin('/login?next=%2F%2Fevil.example');

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/portfolio', { replace: true });
    });
  });

  it('renders authError from useAuth (init / OAuth callback)', () => {
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
      authError: 'Sign-in failed. The link may be invalid or expired — try again.',
    });

    renderLogin();

    expect(
      screen.getByText(/Sign-in failed\. The link may be invalid or expired — try again\./),
    ).toBeInTheDocument();
  });

  it('submits sign-in with trimmed email and password', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText(/your@email\.com/i), '  User@Example.com  ');
    await user.type(screen.getByPlaceholderText(/^password$/i), 'secret12');
    await user.click(getEmailPasswordSubmitButton());

    expect(signInWithPassword).toHaveBeenCalledWith('User@Example.com', 'secret12');
  });

  it('create-account mode calls signUpWithPassword', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    const createTab = screen
      .getAllByRole('button', { name: /^register$/i })
      .find(b => b.getAttribute('type') === 'button');
    expect(createTab).toBeTruthy();
    await user.click(createTab!);
    await user.type(screen.getByPlaceholderText(/your@email\.com/i), 'new@example.com');
    await user.type(screen.getByPlaceholderText(/^password$/i), 'secret12');
    await user.click(getEmailPasswordSubmitButton());

    expect(signUpWithPassword).toHaveBeenCalledWith('new@example.com', 'secret12');
  });

  it('toggles password visibility from eye button', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    const passwordInput = screen.getByPlaceholderText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('supports password visibility toggle in register mode', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    const createTab = screen
      .getAllByRole('button', { name: /^register$/i })
      .find(b => b.getAttribute('type') === 'button');
    expect(createTab).toBeTruthy();
    await user.click(createTab!);

    const passwordInput = screen.getByPlaceholderText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('does not submit form when clicking password visibility toggle', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('updates password toggle aria-label when visibility changes', async () => {
    const user = userEvent.setup();
    stubLocation('');
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hide password/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument();
  });

  it('shows Supabase manual-linking hint when Google linkIdentity is disabled', async () => {
    const user = userEvent.setup();
    stubLocation('');
    signInWithGoogle.mockResolvedValue({
      error: { message: 'Manual linking is disabled' },
    });
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/Allow manual linking/i)).toBeInTheDocument();
    });
  });

  it('shows API error message after failed password sign-in', async () => {
    const user = userEvent.setup();
    stubLocation('');
    signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    mockUseAuth.mockReturnValue({
      ...AUTH_BASE,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText(/your@email\.com/i), 'x@x.com');
    await user.type(screen.getByPlaceholderText(/^password$/i), 'wrongpass');
    await user.click(getEmailPasswordSubmitButton());

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });
});
