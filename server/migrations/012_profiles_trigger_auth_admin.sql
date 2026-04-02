-- OAuth / new sign-ups failed with: error_description=Database+error+saving+new+user
-- Cause: on_auth_user_created runs as supabase_auth_admin; profiles had RLS but no INSERT
-- path for that role, so handle_new_user()'s INSERT was rejected.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT, INSERT ON TABLE public.profiles TO supabase_auth_admin;

DROP POLICY IF EXISTS "profiles_insert_supabase_auth_admin" ON public.profiles;
CREATE POLICY "profiles_insert_supabase_auth_admin"
  ON public.profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_select_supabase_auth_admin" ON public.profiles;
CREATE POLICY "profiles_select_supabase_auth_admin"
  ON public.profiles
  FOR SELECT
  TO supabase_auth_admin
  USING (true);
