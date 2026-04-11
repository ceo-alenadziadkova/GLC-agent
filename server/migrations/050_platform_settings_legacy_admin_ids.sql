-- Optional list of platform admin UUIDs (profiles.id) stored in DB.
-- When non-empty, replaces legacy PLATFORM_ADMIN_USER_IDS env for ACL checks and self-serve fallbacks.
-- Prefer profiles.is_platform_admin for new deployments; use this column to migrate off env without downtime.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS legacy_platform_admin_user_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.platform_settings.legacy_platform_admin_user_ids IS
  'When non-empty, merged with profiles.is_platform_admin for platform settings ACL; supersedes PLATFORM_ADMIN_USER_IDS env. Empty array falls back to env then open mode rules.';
