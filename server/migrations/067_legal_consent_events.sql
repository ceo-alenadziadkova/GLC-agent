-- Append-only GDPR consent / legal acknowledgment audit trail (API writes via service role).
-- RLS: authenticated users may SELECT own rows only; no client INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS public.legal_consent_events (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_key               TEXT         NOT NULL CHECK (
    consent_key IN (
      'tos_acceptance',
      'privacy_acknowledgment',
      'marketing',
      'product_analytics',
      'case_study_use',
      'evaluation_internal',
      'dpa_acceptance'
    )
  ),
  accepted                  BOOLEAN      NOT NULL,
  document_bundle_version   TEXT         NOT NULL,
  tos_version               TEXT         NULL,
  privacy_version           TEXT         NULL,
  dpa_version               TEXT         NULL,
  source                    TEXT         NOT NULL DEFAULT 'api' CHECK (
    source IN ('signup', 'settings', 'api', 'import')
  ),
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_consent_events_user_created_idx
  ON public.legal_consent_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS legal_consent_events_user_key_created_idx
  ON public.legal_consent_events (user_id, consent_key, created_at DESC);

COMMENT ON TABLE public.legal_consent_events IS
  'Append-only log of user legal acknowledgments and optional consents (timestamps + document versions for accountability).';

ALTER TABLE public.legal_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_consent_events_select_own ON public.legal_consent_events;

CREATE POLICY legal_consent_events_select_own
  ON public.legal_consent_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
