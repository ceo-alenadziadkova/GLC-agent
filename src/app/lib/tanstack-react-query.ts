/**
 * Single SPA entry for TanStack Query runtime exports. Prefer importing hooks from here so Vite/Rollup
 * resolve one module boundary (mitigates dev HMR/cache edge cases around named hook imports).
 */
export {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
