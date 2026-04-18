/**
 * PostgREST / Supabase error codes referenced in server logic.
 */

/** No rows returned for `.single()` — often an expected empty state, not a failure. */
export const POSTGREST_NO_ROWS_CODE = 'PGRST116' as const;
