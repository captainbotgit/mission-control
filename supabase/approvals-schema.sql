-- Approvals Schema for Mission Control
-- Run this in Supabase SQL Editor

-- =============================================
-- DELIVERABLES TABLE
-- =============================================
-- Tracks all deliverables submitted by agents for Blake's review
CREATE TABLE IF NOT EXISTS dashboard_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  task_id TEXT,                -- Reference to HEARTBEAT task (e.g., T006)
  type TEXT NOT NULL DEFAULT 'feature' CHECK (type IN ('feature', 'bugfix', 'design', 'content', 'deploy', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  
  -- Deliverable details
  pr_url TEXT,                 -- GitHub PR URL
  deploy_url TEXT,             -- Preview/deployment URL
  screenshot_url TEXT,         -- Screenshot evidence
  branch TEXT,                 -- Git branch name
  files_changed INTEGER,       -- Number of files changed
  
  -- Approval details
  approved_by TEXT,            -- Who approved (e.g., "blake")
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- N8N integration
  n8n_webhook_fired BOOLEAN DEFAULT FALSE,
  n8n_webhook_fired_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_deliverables_status ON dashboard_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_deliverables_agent ON dashboard_deliverables(agent_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_deliverables_created ON dashboard_deliverables(created_at DESC);

-- =============================================
-- APPROVAL LOG TABLE
-- =============================================
-- Audit trail of all approval actions
CREATE TABLE IF NOT EXISTS dashboard_approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES dashboard_deliverables(id),
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted')),
  actor TEXT NOT NULL,         -- Who performed the action
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_approval_log_deliverable ON dashboard_approval_log(deliverable_id);

COMMENT ON TABLE dashboard_deliverables IS 'Agent deliverables pending Blake approval via Mission Control';
COMMENT ON TABLE dashboard_approval_log IS 'Audit trail of all approval/rejection actions';
