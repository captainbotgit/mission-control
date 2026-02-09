import { NextRequest, NextResponse } from 'next/server';

// API: Get recent activity from Supabase
// Falls back to mock if unavailable

interface ActivityItem {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'task' | 'commit' | 'message' | 'alert' | 'deploy';
}

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '30');

  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_activities?select=*&order=timestamp.desc&limit=${limit}`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          next: { revalidate: 30 }, // Cache for 30 seconds
        }
      );

      if (response.ok) {
        const data = await response.json();
        const activities: ActivityItem[] = data.map((row: any) => ({
          id: row.id,
          agent: row.agent_name || capitalizeFirst(row.agent_id),
          agentEmoji: row.agent_emoji || '🤖',
          action: row.action,
          details: row.details || '',
          timestamp: new Date(row.timestamp),
          type: row.type || 'task',
        }));

        return NextResponse.json({
          activities,
          source: 'supabase',
          total: activities.length,
        });
      }
    } catch (e) {
      console.error('[Activity API] Supabase error:', e);
    }
  }

  // Fallback to mock
  console.log('[Activity API] Supabase not configured, using mock data');
  return NextResponse.json({
    activities: getMockActivities(),
    source: 'mock',
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMockActivities(): ActivityItem[] {
  const now = new Date();
  return [
    {
      id: 'mock-1',
      agent: 'Forge',
      agentEmoji: '⚙️',
      action: 'Fixed voice assistant TTS',
      details: 'ElevenLabs TTS now plays on P10S speaker',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      type: 'deploy',
    },
    {
      id: 'mock-2',
      agent: 'Forge',
      agentEmoji: '⚙️',
      action: 'Created dashboard schema',
      details: 'Supabase tables for agents, activities, tasks',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000),
      type: 'commit',
    },
    {
      id: 'mock-3',
      agent: 'Captain',
      agentEmoji: '🎖️',
      action: 'Set Wednesday deadline',
      details: '3 deliverables: dashboard, voice, PE decision',
      timestamp: new Date(now.getTime() - 120 * 60 * 1000),
      type: 'message',
    },
  ];
}
