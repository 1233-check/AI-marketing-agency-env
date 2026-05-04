-- ============================================================
-- Concepts & Design: Supabase Schema + Seed Data
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CONTENT ITEMS TABLE
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'POST',
  status TEXT NOT NULL DEFAULT 'PENDING',
  body TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'INSTAGRAM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'WEBSITE',
  status TEXT NOT NULL DEFAULT 'NEW',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin@123)
-- bcrypt hash generated for "Admin@123"
INSERT INTO users (id, email, password, name, role, created_at) VALUES
  ('cmna4jyh30000xguxnkbxos8o', 'admin@conceptsdesign.com', '$2b$12$mjNmDPIm9RrH3ZRKsOm9ZOvlAZJhKgyfqiggQnBzicv3YL868d6OC', 'Concepts & Design Admin', 'ADMIN', '2026-03-28T09:25:15.203+00:00')
ON CONFLICT (id) DO NOTHING;

-- Content Items
INSERT INTO content_items (id, title, type, status, body, platform, created_at, updated_at) VALUES
  ('cmna4jyhe0001xgux6ch3z14w', 'Modern Villa Showcase — Drone Aerial Tour', 'REEL', 'PENDING', 'Stunning aerial footage of our latest modern villa project in Goa. Features infinity pool, cantilevered decks, and floor-to-ceiling glazing. Perfect for Instagram Reels engagement.', 'INSTAGRAM', '2026-03-28T09:25:15.218+00:00', '2026-03-28T09:25:15.218+00:00'),
  ('cmna4jyhk0002xguxlzv6k9rl', 'Sustainable Architecture: Bamboo & Rammed Earth', 'POST', 'PENDING', 'Deep dive into our sustainable building practices. How we integrate bamboo framing, rammed earth walls, and passive cooling techniques into luxury residential design.', 'LINKEDIN', '2026-03-28T09:25:15.224+00:00', '2026-03-28T09:25:15.224+00:00'),
  ('cmna4jyho0003xgux522oegzs', 'Behind the Blueprint — Design Process Timelapse', 'STORY', 'APPROVED', '24-hour timelapse showing the evolution of a client floor plan from initial sketch to final CAD render. Great for showcasing our process to potential clients.', 'INSTAGRAM', '2026-03-28T09:25:15.228+00:00', '2026-03-28T09:25:15.228+00:00'),
  ('cmna4jyht0004xguxhh1eblq8', 'Client Testimonial: The Sharma Residence', 'POST', 'APPROVED', 'Mr. & Mrs. Sharma share their experience working with Concepts & Design on their 4,500 sq ft contemporary home. Video testimonial with project walkthrough.', 'FACEBOOK', '2026-03-28T09:25:15.233+00:00', '2026-03-28T09:25:15.233+00:00'),
  ('cmna4jyhy0005xgux9mwk7o8p', 'Minimalist Interiors — Before & After', 'REEL', 'REJECTED', 'Before and after transformation of a dated 1990s apartment into a sleek minimalist space. Needs re-edit — lighting in the before shots is too dark.', 'INSTAGRAM', '2026-03-28T09:25:15.238+00:00', '2026-03-28T09:25:15.238+00:00'),
  ('cmna4jyi30006xguxlrd3wyaz', 'Architecture Trends 2026: What''s Next', 'POST', 'PENDING', 'Our take on the top architecture trends for 2026: biophilic design, AI-assisted planning, modular luxury homes, and net-zero energy buildings.', 'LINKEDIN', '2026-03-28T09:25:15.243+00:00', '2026-03-28T09:25:15.243+00:00')
ON CONFLICT (id) DO NOTHING;

-- Leads
INSERT INTO leads (id, name, email, phone, source, status, notes, created_at) VALUES
  ('cmna4jyi90007xguxhmo9knck', 'Arjun Mehta', 'arjun.mehta@gmail.com', '+91 98765 43210', 'INSTAGRAM', 'NEW', 'Interested in a weekend farmhouse near Lonavala. Budget: ₹2-3 Cr. Saw our drone reel.', '2026-03-28T09:25:15.249+00:00'),
  ('cmna4jyid0008xgux4zkcyj0j', 'Priya Kapoor', 'priya.kapoor@outlook.com', '+91 87654 32109', 'WEBSITE', 'CONTACTED', 'Submitted inquiry for office space redesign. 5,000 sq ft commercial in BKC Mumbai. Follow-up call scheduled.', '2026-03-28T09:25:15.253+00:00'),
  ('cmna4jyii0009xguxyfbw5sf5', 'Rajesh & Sunita Patel', 'rajeshpatel@yahoo.com', '+91 76543 21098', 'FACEBOOK', 'QUALIFIED', 'Referred by the Sharma family. Looking for a 3BHK duplex in Pune. Ready to proceed with consultation.', '2026-03-28T09:25:15.258+00:00'),
  ('cmna4jyim000axguxop820uvc', 'Ananya Iyer', 'ananya.iyer@gmail.com', '+91 65432 10987', 'EMAIL', 'NEW', 'Interior designer wanting to collaborate on a boutique hotel project in Jaipur. Sent portfolio.', '2026-03-28T09:25:15.262+00:00'),
  ('cmna4jyir000bxgux8q4klxd2', 'Mohammed Khan', 'm.khan@business.com', '+91 54321 09876', 'INSTAGRAM', 'CONVERTED', 'Signed contract for luxury penthouse in Gurgaon. ₹5 Cr project. Construction begins Q2 2026.', '2026-03-28T09:25:15.267+00:00')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (but allow service role full access)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policies: allow service_role to do everything (the app uses service role key)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON content_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON leads FOR ALL USING (true) WITH CHECK (true);
