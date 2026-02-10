import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API: Get cron jobs
 * Priority: Gateway (live) > Filesystem (HEARTBEAT.md) > Supabase > Mock
 */

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: 'at' | 'every' | 'cron';
    expr?: string;
    at?: string;
    everyMs?: number;
  };
  sessionTarget: 'main' | 'isolated';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4440';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AGENTS_BASE = '/Users/blakeai/.openclaw/agents';

function scanHeartbeatsForSchedules(): CronJob[] {
  const jobs: CronJob[] = [];

  try {
    const agents = fs.readdirSync(AGENTS_BASE, { withFileTypes: true })
      .filter(e => e.isDirectory());

    for (const agent of agents) {
      // Check agent-level HEARTBEAT.md
      const hbPath = path.join(AGENTS_BASE, agent.name, 'agent', 'HEARTBEAT.md');
      if (fs.existsSync(hbPath)) {
        jobs.push({
          id: `heartbeat-${agent.name}`,
          name: `${agent.name} Heartbeat`,
          schedule: { kind: 'every', everyMs: 30 * 60 * 1000 },
          sessionTarget: 'main',
          enabled: true,
        });
      }

      // Check workspace-level HEARTBEAT.md
      const wsHbPath = path.join(AGENTS_BASE, agent.name, 'workspace', 'HEARTBEAT.md');
      if (wsHbPath !== hbPath && fs.existsSync(wsHbPath)) {
        jobs.push({
          id: `heartbeat-ws-${agent.name}`,
          name: `${agent.name} Workspace Heartbeat`,
          schedule: { kind: 'every', everyMs: 30 * 60 * 1000 },
          sessionTarget: 'main',
          enabled: true,
        });
      }
    }
  } catch {}

  return jobs;
}

export async function GET(_request: NextRequest) {
  // Try gateway first (live data)
  if (GATEWAY_URL && GATEWAY_TOKEN) {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/cron/list`, {
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          jobs: data.jobs || [],
          source: 'gateway',
        });
      }
    } catch {
      console.log('[Cron API] Gateway not available');
    }
  }

  // Try Supabase (cached snapshot)
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_cron_jobs?select=*&order=name.asc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          next: { revalidate: 60 },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jobs: CronJob[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          schedule: {
            kind: row.schedule_kind,
            expr: row.schedule_expr,
            everyMs: row.schedule_every_ms,
          },
          sessionTarget: row.session_target || 'main',
          enabled: row.enabled ?? true,
          lastRun: row.last_run,
          nextRun: row.next_run,
        }));

        return NextResponse.json({
          jobs,
          source: 'supabase',
        });
      }
    } catch {
      console.error('[Cron API] Supabase error');
    }
  }

  // Fallback: scan filesystem for heartbeat files
  const fsJobs = scanHeartbeatsForSchedules();
  if (fsJobs.length > 0) {
    return NextResponse.json({
      jobs: fsJobs,
      source: 'filesystem',
      message: 'Detected from HEARTBEAT.md files',
    });
  }

  return NextResponse.json({
    jobs: [],
    source: 'none',
    message: 'Gateway, Supabase, and filesystem sources unavailable',
  });
}
