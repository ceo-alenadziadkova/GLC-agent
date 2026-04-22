/**
 * Upper bound for auth provider user introspection in middleware.
 * Keeps protected route latency bounded during transient Supabase auth outages.
 */
export const AUTH_GET_USER_TIMEOUT_MS = 8000;
