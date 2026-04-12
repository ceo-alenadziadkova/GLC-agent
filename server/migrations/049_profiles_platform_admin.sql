-- Platform settings ACL: designate consultants who may manage self-serve owner and consultant allowlist.
-- When no row has is_platform_admin = true and PLATFORM_ADMIN_USER_IDS is unset, any consultant may manage (open mode).
-- Set at least one profile to true via SQL or future admin UI; legacy PLATFORM_ADMIN_USER_IDS env still honored until removed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Consultant may PATCH platform settings (self-serve audit owner, consultant_email_allowlist). Open mode when no consultant has this flag and PLATFORM_ADMIN_USER_IDS is empty.';
