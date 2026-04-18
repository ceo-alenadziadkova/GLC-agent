import { QueryClient } from '@tanstack/react-query';
import {
  GLC_QUERY_GC_TIME_MS,
  GLC_QUERY_STALE_TIME_MS,
  glcQueryDefaultRetry,
} from './glc-query-client-defaults';

export function createGlcQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: GLC_QUERY_STALE_TIME_MS,
        gcTime: GLC_QUERY_GC_TIME_MS,
        retry: glcQueryDefaultRetry(),
        // Avoid full UI "reload" feel when switching browser tabs: data stays on screen until
        // staleTime expires or user navigates / triggers invalidation. Use explicit refresh actions where needed.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}

let browserClient: QueryClient | null = null;

/** Singleton used by the app shell and non-React callers (`usePipeline`, sign-out). */
export function getGlcQueryClient(): QueryClient {
  if (!browserClient) {
    browserClient = createGlcQueryClient();
  }
  return browserClient;
}
