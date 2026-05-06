-- ============================================================
-- Email Campaigns Table for Concepts & Design
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_campaigns FOR ALL USING (true) WITH CHECK (true);
