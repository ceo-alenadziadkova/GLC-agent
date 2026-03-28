-- Migration 006: Intake Brief
-- Creates intake_brief table for pre-audit questionnaire responses.
-- Brief is filled by client (in portal) or consultant (in NewAudit form),
-- validated before Phase 0 kicks off.

CREATE TABLE IF NOT EXISTS intake_brief (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id             uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  responses            jsonb NOT NULL DEFAULT '{}',
  status               text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'submitted')),
  sla_met              boolean NOT NULL DEFAULT false,  -- all 🔴 required questions answered
  answered_required    int  NOT NULL DEFAULT 0,
  answered_recommended int  NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT intake_brief_audit_unique UNIQUE (audit_id)
);

CREATE INDEX IF NOT EXISTS intake_brief_audit_id_idx ON intake_brief (audit_id);

CREATE TRIGGER intake_brief_updated_at
  BEFORE UPDATE ON intake_brief
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can read/update brief for audits they own or requested
ALTER TABLE intake_brief ENABLE ROW LEVEL SECURITY;

-- Service role (server) bypasses RLS for all writes — no extra policy needed.
-- Clients read via service key anyway (pipeline + portal), so just allow
-- authenticated users to read their own audit's brief.
CREATE POLICY "intake_brief_select_via_audit"
  ON intake_brief FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_id
        AND (a.user_id = auth.uid() OR a.client_id = auth.uid())
    )
  );
