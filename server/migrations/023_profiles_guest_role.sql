-- Guest role: anonymous / snapshot-only sessions must not get full client portal access
-- until they complete registration (Google or email/password). Data stays on the same
-- auth user id when using linkIdentity; attachProfile promotes guest → client/consultant.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('consultant', 'client', 'guest'));

-- Optional one-time backfill (run in SQL Editor if needed):
-- UPDATE public.profiles p SET role = 'guest' FROM auth.users u
-- WHERE u.id = p.id AND p.role = 'client' AND COALESCE(u.is_anonymous, false) = true;

-- Requires auth.users.is_anonymous (Supabase anonymous sign-ins).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    CASE WHEN COALESCE(NEW.is_anonymous, false) THEN 'guest'::text ELSE 'client'::text END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
