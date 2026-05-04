-- ============================================================
-- Email Contacts Table for Concepts & Design
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  list_name TEXT NOT NULL DEFAULT 'General',
  source TEXT NOT NULL DEFAULT 'manual',
  subscribed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_email_contacts_list ON email_contacts(list_name);
CREATE INDEX IF NOT EXISTS idx_email_contacts_subscribed ON email_contacts(subscribed);
CREATE INDEX IF NOT EXISTS idx_email_contacts_source ON email_contacts(source);

-- RLS
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_contacts FOR ALL USING (true) WITH CHECK (true);
