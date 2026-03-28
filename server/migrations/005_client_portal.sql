-- Migration 005: Client Portal
-- Creates profiles table, audit_requests table, and adds client_id to audits.
-- Establishes RLS policies for client vs consultant data isolation.

-- ── 1. Profiles table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'client'
                CHECK (role IN ('consultant', 'client')),
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Insert is handled by server (service role key) — no client-side insert policy


-- ── 2. audit_requests table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audit_id      uuid REFERENCES audits(id) ON DELETE SET NULL,  -- set after consultant approval
  url           text NOT NULL,
  industry      text,
  product_mode  text NOT NULL DEFAULT 'express'
                  CHECK (product_mode IN ('express', 'full')),
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN (
                    'draft',
                    'submitted',
                    'under_review',
                    'approved',
                    'rejected',
                    'running',
                    'delivered'
                  )),
  brief_snapshot  jsonb NOT NULL DEFAULT '{}',
  client_notes    text,
  consultant_note text,                        -- rejection/approval message from consultant
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audit_requests_updated_at
  BEFORE UPDATE ON audit_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS audit_requests_client_id_idx  ON audit_requests (client_id);
CREATE INDEX IF NOT EXISTS audit_requests_audit_id_idx   ON audit_requests (audit_id);
CREATE INDEX IF NOT EXISTS audit_requests_status_idx     ON audit_requests (status);

-- RLS on audit_requests
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;

-- Clients see only their own requests
CREATE POLICY "audit_requests_select_own"
  ON audit_requests FOR SELECT
  USING (client_id = auth.uid());

-- Clients can insert their own requests
CREATE POLICY "audit_requests_insert_own"
  ON audit_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Clients can update their own draft/submitted requests
CREATE POLICY "audit_requests_update_own"
  ON audit_requests FOR UPDATE
  USING (
    client_id = auth.uid()
    AND status IN ('draft', 'submitted')
  );

-- Note: consultant actions (approve/reject/deliver) use service role key
-- which bypasses RLS, so no extra consultant policy needed for server-side ops.


-- ── 3. Add client_id to audits ───────────────────────────────────────────────

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audits_client_id_idx ON audits (client_id);

-- Clients can see their own audits (when client_id matches)
-- Note: existing consultant-owned audits have client_id = NULL and are hidden from clients (correct)
CREATE POLICY "audits_select_own_client"
  ON audits FOR SELECT
  USING (
    client_id = auth.uid()
    OR user_id = auth.uid()          -- consultant's own audits
    OR product_mode = 'free_snapshot' -- snapshot audits are public by token (handled in app layer)
  );


-- ── 4. Auto-create profile on first sign-in (trigger on auth.users) ──────────
-- Note: Supabase recommends a function + trigger on auth.users for this.
-- The server's attachProfile() will upsert via service key as a safer fallback.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (
    NEW.id,
    'client'   -- default; consultant role assigned by server via CONSULTANT_EMAILS check
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
