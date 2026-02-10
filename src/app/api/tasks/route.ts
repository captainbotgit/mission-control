import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const WORKSPACE = '/Users/blakeai/.openclaw/agents/devops/workspace';
const HEARTBEAT_PATH = path.join(WORKSPACE, 'HEARTBEAT.md');
const TASKS_JSON = path.join(WORKSPACE, 'mission-control/data/tasks.json');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  deadline?: string;
  source: string;
  createdAt?: string;
}

function ensureDataDir() {
  const dir = path.dirname(TASKS_JSON);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadUserTasks(): Task[] {
  try {
    if (fs.existsSync(TASKS_JSON)) {
      return JSON.parse(fs.readFileSync(TASKS_JSON, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveUserTasks(tasks: Task[]) {
  ensureDataDir();
  fs.writeFileSync(TASKS_JSON, JSON.stringify(tasks, null, 2));
}

function parseHeartbeatTasks(): Task[] {
  if (!fs.existsSync(HEARTBEAT_PATH)) return [];

  try {
    const content = fs.readFileSync(HEARTBEAT_PATH, 'utf-8');
    const tasks: Task[] = [];

    const queueMatch = content.match(/## Priority Queue[^\n]*\n([\s\S]*?)(?=\n## |\n$)/);
    if (queueMatch) {
      const lines = queueMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-—–]?\s*(.*)/);
        if (match) {
          tasks.push({
            id: `hb-${crypto.createHash('md5').update(match[1]).digest('hex').slice(0, 8)}`,
            title: match[1].trim(),
            status: 'todo',
            priority: tasks.length < 2 ? 'high' : 'medium',
            assignee: 'Forge',
            source: 'HEARTBEAT.md',
          });
        }
      }
    }

    const waitingMatch = content.match(/## Waiting on Blake[^\n]*\n([\s\S]*?)(?=\n## |\n$)/);
    if (waitingMatch) {
      const lines = waitingMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*]\s+(.+)/);
        if (match) {
          tasks.push({
            id: `hb-wait-${crypto.createHash('md5').update(match[1]).digest('hex').slice(0, 8)}`,
            title: match[1].trim(),
            status: 'blocked',
            priority: 'high',
            assignee: 'Blake',
            source: 'HEARTBEAT.md',
          });
        }
      }
    }

    const completedMatch = content.match(/## Completed[^\n]*\n([\s\S]*?)(?=\n## |\n$)/);
    if (completedMatch) {
      const lines = completedMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*]\s+(.+)/);
        if (match) {
          tasks.push({
            id: `hb-done-${crypto.createHash('md5').update(match[1]).digest('hex').slice(0, 8)}`,
            title: match[1].trim(),
            status: 'done',
            priority: 'low',
            assignee: 'Forge',
            source: 'HEARTBEAT.md',
          });
        }
      }
    }

    return tasks;
  } catch {
    return [];
  }
}

// Helper for Supabase REST calls
async function supabaseFetch(path: string, options: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  // 1. Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      let query = 'dashboard_tasks?select=*&order=priority.asc';
      if (status) query += `&status=eq.${status}`;

      const response = await supabaseFetch(query);
      if (response && response.ok) {
        const data = await response.json();
        const tasks: Task[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          priority: row.priority,
          assignee: row.assignee,
          deadline: row.deadline,
          source: row.source || 'supabase',
          createdAt: row.created_at,
        }));

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

  // 2. Filesystem fallback (local dev)
  try {
    const heartbeatTasks = parseHeartbeatTasks();
    const userTasks = loadUserTasks();
    let allTasks = [...userTasks, ...heartbeatTasks];

    if (status) {
      allTasks = allTasks.filter(t => t.status === status);
    }

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      tasks: allTasks,
      source: 'filesystem',
      total: allTasks.length,
    });
  } catch (e) {
    console.error('[Tasks API] Filesystem error:', e);
  }

  // 3. Empty response
  return NextResponse.json({ tasks: [], source: 'none', total: 0 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, status = 'todo', priority = 'medium', assignee, deadline } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newTask = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      title,
      status,
      priority,
      assignee,
      deadline,
      source: 'user',
    };

    // Try Supabase first
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const response = await supabaseFetch('dashboard_tasks', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(newTask),
        });
        if (response && response.ok) {
          const [created] = await response.json();
          return NextResponse.json({ task: created || newTask, success: true, source: 'supabase' }, { status: 201 });
        }
      } catch (e) {
        console.error('[Tasks API] Supabase POST error:', e);
      }
    }

    // Filesystem fallback
    const tasks = loadUserTasks();
    const fsTask: Task = { ...newTask, createdAt: new Date().toISOString() };
    tasks.push(fsTask);
    saveUserTasks(tasks);

    return NextResponse.json({ task: fsTask, success: true, source: 'filesystem' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Try Supabase first
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const response = await supabaseFetch(`dashboard_tasks?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(updates),
        });
        if (response && response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            return NextResponse.json({ task: data[0], success: true, source: 'supabase' });
          }
        }
      } catch (e) {
        console.error('[Tasks API] Supabase PUT error:', e);
      }
    }

    // Filesystem fallback
    const tasks = loadUserTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Task not found (only user-created tasks can be edited)' }, { status: 404 });
    }

    tasks[idx] = { ...tasks[idx], ...updates, id: tasks[idx].id, source: 'user' };
    saveUserTasks(tasks);

    return NextResponse.json({ task: tasks[idx], success: true, source: 'filesystem' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Try Supabase first
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const response = await supabaseFetch(`dashboard_tasks?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Prefer': 'return=representation' },
        });
        if (response && response.ok) {
          return NextResponse.json({ success: true, deleted: id, source: 'supabase' });
        }
      } catch (e) {
        console.error('[Tasks API] Supabase DELETE error:', e);
      }
    }

    // Filesystem fallback
    const tasks = loadUserTasks();
    const filtered = tasks.filter(t => t.id !== id);
    if (filtered.length === tasks.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    saveUserTasks(filtered);
    return NextResponse.json({ success: true, deleted: id, source: 'filesystem' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
