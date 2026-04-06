/**
 * Pure helper: where `/` should redirect based on query/hash (OAuth callback preservation).
 */
export function rootRedirectTarget(search: string, hash: string): string {
  const hasAuthCallback =
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error=');
  if (hasAuthCallback) {
    return `/login${search}${hash}`;
  }
  return '/dashboard';
}
