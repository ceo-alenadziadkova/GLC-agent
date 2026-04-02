import { Navigate } from 'react-router';

/**
 * Sends `/` to `/dashboard`, but if Supabase OAuth/magic-link params landed on the root URL,
 * forward them to `/login` first so `useAuth` can run `exchangeCodeForSession` / `setSession`.
 * A bare `<Navigate to="/dashboard" />` would drop `?code=` or `#access_token=` and leave no session.
 */
export function RootRedirect() {
  const search = window.location.search;
  const hash = window.location.hash;
  const hasAuthCallback =
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error=');
  if (hasAuthCallback) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}
