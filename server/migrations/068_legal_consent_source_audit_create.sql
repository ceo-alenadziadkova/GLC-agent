-- Allow consent events recorded when a consultant accepts the DPA at audit creation time.

ALTER TABLE public.legal_consent_events
  DROP CONSTRAINT IF EXISTS legal_consent_events_source_check;

ALTER TABLE public.legal_consent_events
  ADD CONSTRAINT legal_consent_events_source_check CHECK (
    source IN ('signup', 'settings', 'api', 'import', 'audit_create')
  );
