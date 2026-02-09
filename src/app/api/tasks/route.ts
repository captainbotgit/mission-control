import { NextRequest, NextResponse } from 'next/server';

// API: Get tasks from Supabase
// Falls back to mock if unavailable

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  deadline?: string;
  source: string;
}

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      let url = `${SUPABASE_URL}/rest/v1/dashboard_tasks?select=*`;
      if (status) {
        url += `&status=eq.${status}`;
      }
      url += '&order=priority.asc,created_at.desc';

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      });

      if (response.ok) {
        const data = await response.json();
        const tasks: Task[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          status: row.status || 'todo',
          priority: row.priority || 'medium',
          assignee: row.assignee,
          deadline: row.deadline,
          source: row.source || 'Supabase',
        }));

        // Sort by priority (high first)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return NextResponse.json({
          tasks,
          source: 'supabase',
          total: tasks.length,
        });
      }
    } catch (e) {
      console.error('[Tasks API] Supabase error:', e);
    }
  }

  // Fallback to mock
  console.log('[Tasks API] Supabase not configured, using mock data');
  const mockTasks = getMockTasks();
  const filtered = status ? mockTasks.filter(t => t.status === status) : mockTasks;

  return NextResponse.json({
    tasks: filtered,
    source: 'mock',
  });
}

function getMockTasks(): Task[] {
  return [
    {
      id: 'task-1',
      title: 'Dashboard phantom data fix — wire to Supabase',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'task-2',
      title: 'Voice assistant end-to-end',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'task-3',
      title: 'PE build-vs-rebuild decision',
      status: 'todo',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'task-4',
      title: 'Review Portal Supabase persistence',
      status: 'done',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
  ];
}
