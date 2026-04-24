-- Fix evaluation_datasets BEFORE INSERT trigger when platform_settings row id=1 is missing:
-- SELECT ... INTO with 0 rows assigns NULL to all targets, so make_interval(days => NULL) yielded NULL expires_at.

CREATE OR REPLACE FUNCTION public.set_evaluation_datasets_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_default_days integer;
  v_extended_days integer;
  v_internal_only_days integer;
BEGIN
  SELECT
    COALESCE(ps.evaluation_retention_default_days, 90),
    COALESCE(ps.evaluation_retention_extended_days, 365),
    COALESCE(ps.evaluation_retention_internal_only_days, 365)
  INTO v_default_days, v_extended_days, v_internal_only_days
  FROM public.platform_settings ps
  WHERE ps.id = 1;

  IF NOT FOUND
     OR v_default_days IS NULL
     OR v_extended_days IS NULL
     OR v_internal_only_days IS NULL
  THEN
    v_default_days := 90;
    v_extended_days := 365;
    v_internal_only_days := 365;
  END IF;

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
