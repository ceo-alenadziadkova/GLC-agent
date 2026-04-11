-- Consultant role bootstrap: normalized emails that receive `consultant` on first `attachProfile`.
-- Managed via API (platform admins) or direct SQL. Deprecated: CONSULTANT_EMAILS env (comma-separated)
-- is still merged for one release; prefer rows in this table.

CREATE TABLE IF NOT EXISTS public.consultant_email_allowlist (
  email_normalized text PRIMARY KEY
    CHECK (
      length(trim(email_normalized)) > 0
      AND email_normalized = lower(email_normalized)
      AND strpos(email_normalized, '@') > 1
    ),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consultant_email_allowlist IS
  'Lowercase emails promoted to consultant on profile attach. Server merges with deprecated CONSULTANT_EMAILS env.';

ALTER TABLE public.consultant_email_allowlist ENABLE ROW LEVEL SECURITY;

-- No client access; backend uses service role (bypasses RLS).
CREATE POLICY "consultant_allowlist_deny_authenticated"
  ON public.consultant_email_allowlist
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "consultant_allowlist_deny_anon"
  ON public.consultant_email_allowlist
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
