import { NextRequest, NextResponse } from 'next/server';

/**
 * API: Get cron jobs from OpenClaw Gateway
 * Proxies to the gateway's cron API
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

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from gateway
    if (GATEWAY_URL && GATEWAY_TOKEN) {
      try {
        const response = await fetch(`${GATEWAY_URL}/api/cron/list`, {
          headers: {
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          // Short timeout
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
        console.log('[Cron API] Gateway not available:', e);
      }
    }

    // Return mock data if gateway not available
    return NextResponse.json({
      jobs: getMockCronJobs(),
      source: 'mock',
      message: 'Gateway not available, showing mock data',
    });

  } catch (error) {
    console.error('[Cron API] Error:', error);
    return NextResponse.json({
      jobs: getMockCronJobs(),
      source: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function getMockCronJobs(): CronJob[] {
  const now = new Date();
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

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
      name: 'Daily Digest Report',
      schedule: { kind: 'cron', expr: '0 9 * * *' },
      sessionTarget: 'isolated',
      enabled: true,
      lastRun: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      nextRun: tomorrow9am.toISOString(),
    },
    {
      id: 'email-check',
      name: 'Email Inbox Check',
      schedule: { kind: 'every', everyMs: 60 * 60 * 1000 },
      sessionTarget: 'main',
      enabled: true,
      lastRun: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      nextRun: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'calendar-sync',
      name: 'Calendar Sync',
      schedule: { kind: 'every', everyMs: 4 * 60 * 60 * 1000 },
      sessionTarget: 'isolated',
      enabled: true,
      lastRun: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
