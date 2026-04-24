/**
 * Client policy for `/api/benchmarks`. Must stay aligned with server `API_ERROR_CODES` / `apiErrorJson` bodies.
 */

/** Server returns HTTP 503 with this code when `FEATURE_BENCHMARKS` is off. */
export const BENCHMARKS_FEATURE_DISABLED_API_CODE = 'BENCHMARKS_FEATURE_DISABLED' as const;
