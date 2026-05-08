/**
 * PostgREST / Supabase error codes referenced in server logic.
 */

/** No rows returned for `.single()` — often an expected empty state, not a failure. */
export const POSTGREST_NO_ROWS_CODE = 'PGRST116' as const;

/** Postgres undefined_table error (table not yet migrated in additive rollout paths). */
export const POSTGRES_UNDEFINED_TABLE_CODE = '42P01' as const;
