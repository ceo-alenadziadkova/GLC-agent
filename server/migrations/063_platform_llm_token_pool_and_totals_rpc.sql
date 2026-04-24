-- Optional platform-wide LLM token pool cap (operational; non-secret).
-- Remaining (when cap is set) = cap - SUM(audits.tokens_used) across all audits.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS llm_token_pool_cap bigint
  CHECK (llm_token_pool_cap IS NULL OR llm_token_pool_cap >= 0);

COMMENT ON COLUMN public.platform_settings.llm_token_pool_cap IS
  'Optional cap on aggregate Claude token usage (matches audits.tokens_used sum). NULL = pool not shown. Set via SQL or ops.';

-- Aggregates for token usage summary (service role only).

CREATE OR REPLACE FUNCTION public.audit_token_totals_for_user(p_user_id uuid)
RETURNS TABLE(
  sum_tokens_used bigint,
  sum_token_budget bigint,
  sum_tokens_remaining_nonneg bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(a.tokens_used), 0)::bigint,
    COALESCE(SUM(a.token_budget), 0)::bigint,
    COALESCE(SUM(GREATEST(0, a.token_budget - a.tokens_used)), 0)::bigint
  FROM public.audits a
  WHERE a.user_id = p_user_id OR a.client_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.audit_token_totals_global()
RETURNS TABLE(sum_tokens_used bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(a.tokens_used), 0)::bigint
  FROM public.audits a;
$$;

REVOKE ALL ON FUNCTION public.audit_token_totals_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_token_totals_for_user(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.audit_token_totals_global() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_token_totals_global() TO service_role;
