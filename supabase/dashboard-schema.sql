-- Dashboard Schema for Mission Control
-- Run this in Supabase SQL Editor (ClawdBar project)
-- Tables prefixed with dashboard_ to avoid collision with ClawdBar agents table

-- =============================================
-- DASHBOARD AGENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🤖',
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('active', 'idle', 'offline')),
  role TEXT,
  last_activity TIMESTAMPTZ,
  memory_files INTEGER DEFAULT 0,
  workspace_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_agents_status ON dashboard_agents(status);

-- =============================================
-- DASHBOARD ACTIVITIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_activities (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  agent_emoji TEXT DEFAULT '🤖',
  action TEXT NOT NULL,
  details TEXT,
  type TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'commit', 'message', 'alert', 'deploy')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_activities_timestamp ON dashboard_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_activities_agent ON dashboard_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activities_type ON dashboard_activities(type);

-- =============================================
-- DASHBOARD TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assignee TEXT,
  deadline TIMESTAMPTZ,
  source TEXT,
  agent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_status ON dashboard_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_priority ON dashboard_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_assignee ON dashboard_tasks(assignee);

-- =============================================
-- DASHBOARD CRON JOBS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('at', 'every', 'cron')),
  schedule_expr TEXT,
  schedule_every_ms BIGINT,
  session_target TEXT DEFAULT 'main' CHECK (session_target IN ('main', 'isolated')),
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cron_enabled ON dashboard_cron_jobs(enabled);
CREATE INDEX IF NOT EXISTS idx_dashboard_cron_next_run ON dashboard_cron_jobs(next_run);

-- =============================================
-- UPDATED AT TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dashboard_agents_updated_at ON dashboard_agents;
CREATE TRIGGER dashboard_agents_updated_at
  BEFORE UPDATE ON dashboard_agents
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

DROP TRIGGER IF EXISTS dashboard_tasks_updated_at ON dashboard_tasks;
CREATE TRIGGER dashboard_tasks_updated_at
  BEFORE UPDATE ON dashboard_tasks
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

DROP TRIGGER IF EXISTS dashboard_cron_jobs_updated_at ON dashboard_cron_jobs;
CREATE TRIGGER dashboard_cron_jobs_updated_at
  BEFORE UPDATE ON dashboard_cron_jobs
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE dashboard_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all dashboard_agents" ON dashboard_agents FOR ALL USING (true);
CREATE POLICY "Allow all dashboard_activities" ON dashboard_activities FOR ALL USING (true);
CREATE POLICY "Allow all dashboard_tasks" ON dashboard_tasks FOR ALL USING (true);
CREATE POLICY "Allow all dashboard_cron_jobs" ON dashboard_cron_jobs FOR ALL USING (true);

-- =============================================
-- SEED DATA (Initial Fleet)
-- =============================================
INSERT INTO dashboard_agents (id, name, emoji, status, role, last_activity) VALUES
  ('main', 'Captain', '🎖️', 'active', 'Fleet Commander', NOW()),
  ('devops', 'Forge', '⚙️', 'active', 'CTO / DevOps', NOW()),
  ('friday', 'Friday', '📚', 'idle', 'Research', NOW() - INTERVAL '1 day'),
  ('ultron', 'Ultron', '🤖', 'idle', 'Trading', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  role = EXCLUDED.role,
  last_activity = EXCLUDED.last_activity,
  status = EXCLUDED.status;

-- Seed some tasks from HEARTBEAT
INSERT INTO dashboard_tasks (id, title, status, priority, assignee, source) VALUES
  ('task-1', 'Dashboard phantom data fix — wire to Supabase', 'in-progress', 'high', 'Forge', 'HEARTBEAT.md'),
  ('task-2', 'Voice assistant end-to-end', 'in-progress', 'high', 'Forge', 'HEARTBEAT.md'),
  ('task-3', 'PE build-vs-rebuild decision', 'todo', 'high', 'Forge', 'HEARTBEAT.md'),
  ('task-4', 'Swap CLI for Ultron', 'todo', 'medium', 'Forge', 'PRIORITY-QUEUE.md'),
  ('task-5', 'Review Portal Supabase persistence', 'done', 'high', 'Forge', 'HEARTBEAT.md'),
  ('task-6', 'Mission Control full bake', 'in-progress', 'medium', 'Forge', 'PRIORITY-QUEUE.md')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority;

-- Seed recent activities
INSERT INTO dashboard_activities (id, agent_id, agent_name, agent_emoji, action, details, type, timestamp) VALUES
  ('act-1', 'devops', 'Forge', '⚙️', 'Fixed voice assistant TTS', 'ElevenLabs TTS now plays on P10S speaker', 'deploy', NOW() - INTERVAL '30 minutes'),
  ('act-2', 'devops', 'Forge', '⚙️', 'Created dashboard schema', 'Supabase tables for agents, activities, tasks', 'commit', NOW() - INTERVAL '15 minutes'),
  ('act-3', 'main', 'Captain', '🎖️', 'Set Wednesday deadline', '3 deliverables: dashboard, voice, PE decision', 'message', NOW() - INTERVAL '1 hour'),
  ('act-4', 'devops', 'Forge', '⚙️', 'Review Portal shipped', 'Live at mission-control-eight-alpha.vercel.app/reviews', 'deploy', NOW() - INTERVAL '2 hours'),
  ('act-5', 'devops', 'Forge', '⚙️', 'Supabase persistence added', 'Reviews now persist across cold starts', 'commit', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE dashboard_agents IS 'OpenClaw fleet agents and their status';
COMMENT ON TABLE dashboard_activities IS 'Activity feed from agent work';
COMMENT ON TABLE dashboard_tasks IS 'Task board items from HEARTBEAT.md';
COMMENT ON TABLE dashboard_cron_jobs IS 'Cron job status (synced from gateway)';
