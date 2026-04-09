import { getGlcQueryClient } from './glc-query-client';

/**
 * Clears all TanStack Query caches (e.g. sign-out). Kept under this name for `useAuth` call sites.
 */
export function invalidateGlcSessionDataCaches(): void {
  getGlcQueryClient().clear();
}
