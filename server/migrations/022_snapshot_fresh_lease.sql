-- Cross-instance fresh-fetch concurrency for free snapshot (opt-in: SNAPSHOT_SHARED_ABUSE_STORE=1).
-- Rows are short-lived leases; expired rows are deleted on each acquire. No Redis.

CREATE TABLE IF NOT EXISTS snapshot_fresh_lease (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshot_fresh_lease_expires_at ON snapshot_fresh_lease (expires_at);

COMMENT ON TABLE snapshot_fresh_lease IS 'Active fresh snapshot workers (TTL). Count bounded by SNAPSHOT_MAX_CONCURRENT when shared store is enabled.';

-- Serialized acquire: garbage-collect, count unexpired leases, insert if under cap.
CREATE OR REPLACE FUNCTION public.snapshot_try_acquire_fresh_lease(p_max integer, p_ttl_seconds integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer := LEAST(GREATEST(COALESCE(p_max, 4), 1), 64);
  v_ttl interval := make_interval(secs => GREATEST(COALESCE(p_ttl_seconds, 300), 60));
  v_count integer;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(88429031);

  DELETE FROM public.snapshot_fresh_lease WHERE expires_at < now();

  SELECT COUNT(*)::integer INTO v_count FROM public.snapshot_fresh_lease;

  IF v_count >= v_max THEN
    RETURN NULL;
  END IF;

  v_id := gen_random_uuid();
  INSERT INTO public.snapshot_fresh_lease (id, expires_at) VALUES (v_id, now() + v_ttl);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_release_fresh_lease(p_lease_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.snapshot_fresh_lease WHERE id = p_lease_id;
$$;

GRANT EXECUTE ON FUNCTION public.snapshot_try_acquire_fresh_lease(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.snapshot_release_fresh_lease(uuid) TO service_role;

ALTER TABLE public.snapshot_fresh_lease ENABLE ROW LEVEL SECURITY;
