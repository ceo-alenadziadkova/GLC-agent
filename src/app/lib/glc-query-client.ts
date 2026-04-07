import { QueryClient } from '@tanstack/react-query';

export function createGlcQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 120_000,
        gcTime: 900_000,
        retry: 1,
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
