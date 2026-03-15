-- GLC Audit Platform — Initial Schema
-- Run this in Supabase SQL Editor

-- ─── Audits ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) NOT NULL,
  company_url     text NOT NULL,
  company_name    text,
  industry        text,
  status          text DEFAULT 'created' CHECK (status IN ('created', 'recon', 'auto', 'analytic', 'review', 'completed', 'failed')),
  current_phase   int DEFAULT 0,
  overall_score   numeric(3,1),
  token_budget    int DEFAULT 200000,
  tokens_used     int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── Recon Data ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_recon (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          uuid REFERENCES audits(id) ON DELETE CASCADE UNIQUE,
  status            text DEFAULT 'pending',
  company_name      text,
  industry          text,
  location          text,
  languages         jsonb DEFAULT '[]',
  tech_stack        jsonb DEFAULT '{}',
  social_profiles   jsonb DEFAULT '{}',
  contact_info      jsonb DEFAULT '{}',
  pages_crawled     jsonb DEFAULT '[]',
  brief             text,
  interview_answers text,
  created_at        timestamptz DEFAULT now()
);

-- ─── Domain Results ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_domains (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        uuid REFERENCES audits(id) ON DELETE CASCADE,
  domain_key      text NOT NULL,
  phase_number    int NOT NULL,
  status          text DEFAULT 'pending',
  score           int CHECK (score IS NULL OR (score >= 1 AND score <= 5)),
  label           text,
  version         int DEFAULT 1,
  summary         text,
  strengths       jsonb DEFAULT '[]',
  weaknesses      jsonb DEFAULT '[]',
  issues          jsonb DEFAULT '[]',
  quick_wins      jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  raw_data        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  UNIQUE(audit_id, domain_key, version)
);

-- ─── Strategy & Roadmap ────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_strategy (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          uuid REFERENCES audits(id) ON DELETE CASCADE UNIQUE,
  status            text DEFAULT 'pending',
  executive_summary text,
  overall_score     numeric(3,1),
  quick_wins        jsonb DEFAULT '[]',
  medium_term       jsonb DEFAULT '[]',
  strategic         jsonb DEFAULT '[]',
  scorecard         jsonb DEFAULT '[]',
  created_at        timestamptz DEFAULT now()
);

-- ─── Pipeline Events (for Realtime) ───────────────────────
CREATE TABLE IF NOT EXISTS pipeline_events (
  id              bigserial PRIMARY KEY,
  audit_id        uuid REFERENCES audits(id) ON DELETE CASCADE,
  phase           int NOT NULL,
  event_type      text NOT NULL,
  message         text,
  data            jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

-- ─── Collected Data (cache for re-runs) ───────────────────
CREATE TABLE IF NOT EXISTS collected_data (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        uuid REFERENCES audits(id) ON DELETE CASCADE,
  collector_key   text NOT NULL,
  phase           int NOT NULL,
  data            jsonb NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(audit_id, collector_key)
);

-- ─── Review Points ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_points (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          uuid REFERENCES audits(id) ON DELETE CASCADE,
  after_phase       int NOT NULL,
  status            text DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  consultant_notes  text,
  interview_notes   text,
  approved_at       timestamptz,
  UNIQUE(audit_id, after_phase)
);

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_audit ON pipeline_events(audit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_domains_audit ON audit_domains(audit_id);
CREATE INDEX IF NOT EXISTS idx_collected_data_audit ON collected_data(audit_id);

-- ─── RLS Policies ──────────────────────────────────────────
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_recon ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collected_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_points ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audits
CREATE POLICY "Users see own audits" ON audits
  FOR ALL USING (auth.uid() = user_id);

-- Cascade policies via audit ownership
CREATE POLICY "Users see own recon" ON audit_recon
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users see own domains" ON audit_domains
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users see own strategy" ON audit_strategy
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users see own events" ON pipeline_events
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users see own collected data" ON collected_data
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users see own reviews" ON review_points
  FOR ALL USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

-- ─── Enable Realtime ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_events;
ALTER PUBLICATION supabase_realtime ADD TABLE audits;

-- ─── Updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
