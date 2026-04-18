-- PostgREST / Supabase: backend calls this RPC with the service role key.
-- Without EXECUTE, rpc() fails and convert returns 500.

GRANT EXECUTE ON FUNCTION public.discovery_convert_session_atomic(
  text,
  uuid,
  text,
  text,
  integer[],
  text[]
) TO service_role;
