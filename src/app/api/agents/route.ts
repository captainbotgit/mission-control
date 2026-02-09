import { NextRequest, NextResponse } from 'next/server';

// API: Get agent list and status from Supabase
// Falls back to filesystem on local dev, mock if unavailable

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  status: 'active' | 'idle' | 'offline';
  role?: string;
  lastActivity: string | null;
  memoryFiles: number;
  workspacePath: string;
}

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_agents?select=*&order=status.asc`,
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
        const agents: AgentInfo[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          emoji: row.emoji || '🤖',
          status: row.status || 'offline',
          role: row.role,
          lastActivity: row.last_activity ? new Date(row.last_activity).toISOString().split('T')[0] : null,
          memoryFiles: row.memory_files || 0,
          workspacePath: row.workspace_path || '',
        }));

        // Sort by status (active first)
        const statusOrder = { active: 0, idle: 1, offline: 2 };
        agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        return NextResponse.json({
          agents,
          source: 'supabase',
          count: agents.length,
        });
      }
    } catch (e) {
      console.error('[Agents API] Supabase error:', e);
    }
  }

  // Fallback to mock data if Supabase not available
  console.log('[Agents API] Supabase not configured, using mock data');
  return NextResponse.json({
    agents: getMockAgents(),
    source: 'mock',
    message: 'Supabase not configured',
  });
}

function getMockAgents(): AgentInfo[] {
  return [
    {
      id: 'main',
      name: 'Captain',
      emoji: '🎖️',
      status: 'active',
      role: 'Fleet Commander',
      lastActivity: new Date().toISOString().split('T')[0],
      memoryFiles: 8,
      workspacePath: '/mock/captain',
    },
    {
      id: 'devops',
      name: 'Forge',
      emoji: '⚙️',
      status: 'active',
      role: 'CTO / DevOps',
      lastActivity: new Date().toISOString().split('T')[0],
      memoryFiles: 12,
      workspacePath: '/mock/forge',
    },
  ];
}
