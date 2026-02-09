-- Review Portal Schema for Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'copy', 'image', 'website', 'video', 'code', 'other')),
  
  -- Content fields
  content TEXT,
  content_url TEXT,
  image_url TEXT,
  video_url TEXT,
  preview_url TEXT,
  file_path TEXT,
  
  -- Metadata
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  tags JSONB DEFAULT '[]',
  
  -- Captain pre-review
  captain_recommendation TEXT CHECK (captain_recommendation IN ('pending', 'approved', 'rejected', 'changes_requested')),
  captain_notes TEXT,
  
  -- Blake's decision
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  decision JSONB,
  history JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_submitted_at ON reviews(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_submitted_by ON reviews(submitted_by);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow anon/service role full access (agents submit, dashboard reads)
CREATE POLICY "Allow all access" ON reviews FOR ALL USING (true);

COMMENT ON TABLE reviews IS 'Review Portal items awaiting Blake approval';
