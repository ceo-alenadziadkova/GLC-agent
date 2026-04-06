-- Platform-wide settings (singleton row). Written only via API (service role).

CREATE TABLE IF NOT EXISTS platform_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  self_serve_audit_owner_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (id)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE id = 1);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
