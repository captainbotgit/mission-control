import { NextRequest, NextResponse } from 'next/server';

/**
 * API: Get cron jobs
 * Priority: Gateway (live) > Supabase (cached) > Mock
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

export async function GET(request: NextRequest) {
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
    } catch (e) {
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
          message: 'Gateway not available, showing cached data',
        });
      }
    } catch (e) {
      console.error('[Cron API] Supabase error:', e);
    }
  }

  // Fallback to mock
  return NextResponse.json({
    jobs: getMockCronJobs(),
    source: 'mock',
    message: 'Gateway and Supabase not available',
  });
}

function getMockCronJobs(): CronJob[] {
  const now = new Date();
  return [
    {
      id: 'heartbeat-main',
      name: 'Main Session Heartbeat',
      schedule: { kind: 'every', everyMs: 30 * 60 * 1000 },
      sessionTarget: 'main',
      enabled: true,
      lastRun: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      nextRun: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'daily-digest',
      name: 'Daily Digest',
      schedule: { kind: 'cron', expr: '0 9 * * *' },
      sessionTarget: 'isolated',
      enabled: true,
    },
  ];
}
