-- Runtime-tunable platform policies (non-secret): intake token TTL and evaluation retention windows.
-- Keeps previous behavior via NULL columns + COALESCE defaults.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS intake_token_ttl_days integer
  CHECK (intake_token_ttl_days IS NULL OR intake_token_ttl_days BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS evaluation_retention_default_days integer
  CHECK (evaluation_retention_default_days IS NULL OR evaluation_retention_default_days BETWEEN 1 AND 3650),
  ADD COLUMN IF NOT EXISTS evaluation_retention_extended_days integer
  CHECK (evaluation_retention_extended_days IS NULL OR evaluation_retention_extended_days BETWEEN 1 AND 3650),
  ADD COLUMN IF NOT EXISTS evaluation_retention_internal_only_days integer
  CHECK (evaluation_retention_internal_only_days IS NULL OR evaluation_retention_internal_only_days BETWEEN 1 AND 3650);

COMMENT ON COLUMN public.platform_settings.intake_token_ttl_days IS
  'Optional runtime override for intake token TTL (days). NULL keeps app/config default.';
COMMENT ON COLUMN public.platform_settings.evaluation_retention_default_days IS
  'Optional runtime override for evaluation_datasets retention when retention_policy=default. NULL -> 90 days.';
COMMENT ON COLUMN public.platform_settings.evaluation_retention_extended_days IS
  'Optional runtime override for evaluation_datasets retention when retention_policy=extended. NULL -> 365 days.';
COMMENT ON COLUMN public.platform_settings.evaluation_retention_internal_only_days IS
  'Optional runtime override for evaluation_datasets retention when retention_policy=internal_only. NULL -> 365 days.';

CREATE OR REPLACE FUNCTION public.set_evaluation_datasets_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_default_days integer := 90;
  v_extended_days integer := 365;
  v_internal_only_days integer := 365;
BEGIN
  SELECT
    COALESCE(ps.evaluation_retention_default_days, v_default_days),
    COALESCE(ps.evaluation_retention_extended_days, v_extended_days),
    COALESCE(ps.evaluation_retention_internal_only_days, v_internal_only_days)
  INTO v_default_days, v_extended_days, v_internal_only_days
  FROM public.platform_settings ps
  WHERE ps.id = 1;

  NEW.expires_at := NEW.created_at + make_interval(
    days => CASE NEW.retention_policy
      WHEN 'extended' THEN v_extended_days
      WHEN 'internal_only' THEN v_internal_only_days
      ELSE v_default_days
    END
  );
  RETURN NEW;
END;
$fn$;
