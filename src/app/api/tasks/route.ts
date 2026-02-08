import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// API: Get tasks from TASK-BOARD.md or HEARTBEAT.md files
// Reads from ~/.openclaw/agents/{agent}/workspace/

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  deadline?: string;
  source: string;
}

const AGENTS_DIR = process.env.AGENTS_DIR || path.join(process.env.HOME || '', '.openclaw', 'agents');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const tasks: Task[] = [];

    // Read from agents directory
    let agentDirs: string[] = [];
    try {
      agentDirs = await fs.readdir(AGENTS_DIR);
    } catch (e) {
      return NextResponse.json({
        tasks: getMockTasks(),
        source: 'mock',
      });
    }

    for (const agentId of agentDirs) {
      const workspacePath = path.join(AGENTS_DIR, agentId, 'workspace');

      // Check TASK-BOARD.md
      const taskBoardPath = path.join(workspacePath, 'TASK-BOARD.md');
      try {
        const content = await fs.readFile(taskBoardPath, 'utf-8');
        const parsed = parseTaskBoard(content, agentId);
        tasks.push(...parsed);
      } catch {
        // No TASK-BOARD.md
      }

      // Check HEARTBEAT.md for priorities
      const heartbeatPath = path.join(workspacePath, 'HEARTBEAT.md');
      try {
        const content = await fs.readFile(heartbeatPath, 'utf-8');
        const parsed = parseHeartbeat(content, agentId);
        tasks.push(...parsed);
      } catch {
        // No HEARTBEAT.md
      }

      // Check PRIORITY-QUEUE.md
      const priorityPath = path.join(workspacePath, 'PRIORITY-QUEUE.md');
      try {
        const content = await fs.readFile(priorityPath, 'utf-8');
        const parsed = parsePriorityQueue(content, agentId);
        tasks.push(...parsed);
      } catch {
        // No PRIORITY-QUEUE.md
      }
    }

    // Filter by status if specified
    const filtered = status 
      ? tasks.filter(t => t.status === status)
      : tasks;

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      tasks: filtered,
      source: 'filesystem',
      total: filtered.length,
    });

  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json({
      tasks: getMockTasks(),
      source: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function parseTaskBoard(content: string, agentId: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  let currentStatus: Task['status'] = 'todo';
  let taskCount = 0;

  for (const line of lines) {
    // Detect section headers
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('in progress') || lowerLine.includes('in-progress')) {
      currentStatus = 'in-progress';
      continue;
    } else if (lowerLine.includes('done') || lowerLine.includes('completed')) {
      currentStatus = 'done';
      continue;
    } else if (lowerLine.includes('blocked')) {
      currentStatus = 'blocked';
      continue;
    } else if (lowerLine.includes('todo') || lowerLine.includes('to do') || lowerLine.includes('pending')) {
      currentStatus = 'todo';
      continue;
    }

    // Parse task items
    const taskMatch = line.match(/^[-*]\s+\[(.)\]\s+(.+)/) || line.match(/^[-*]\s+(.+)/);
    if (taskMatch) {
      const checkbox = taskMatch[1];
      const text = taskMatch[2] || taskMatch[1];

      // Skip if just checkbox parsing and text is single char
      if (text.length < 3) continue;

      // Determine status from checkbox
      let status = currentStatus;
      if (checkbox === 'x' || checkbox === 'X') status = 'done';
      else if (checkbox === ' ') status = 'todo';

      // Determine priority
      let priority: Task['priority'] = 'medium';
      if (text.includes('URGENT') || text.includes('CRITICAL') || text.includes('🔴')) {
        priority = 'high';
      } else if (text.includes('LOW') || text.includes('🟢')) {
        priority = 'low';
      }

      tasks.push({
        id: `${agentId}-task-${taskCount++}`,
        title: cleanTaskText(text),
        status,
        priority,
        assignee: capitalizeFirst(agentId),
        source: 'TASK-BOARD.md',
      });
    }
  }

  return tasks;
}

function parseHeartbeat(content: string, agentId: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  let inPriorities = false;
  let taskCount = 0;

  for (const line of lines) {
    // Look for priority section
    if (line.toLowerCase().includes('priorit') || line.toLowerCase().includes('today')) {
      inPriorities = true;
      continue;
    }

    if (inPriorities && (line.startsWith('## ') || line.startsWith('# '))) {
      inPriorities = false;
      continue;
    }

    if (inPriorities) {
      const taskMatch = line.match(/^[-*\d.]+\s+\*\*(.+?)\*\*/) || line.match(/^[-*\d.]+\s+(.+)/);
      if (taskMatch) {
        const text = taskMatch[1];
        if (text.length < 3) continue;

        tasks.push({
          id: `${agentId}-hb-${taskCount++}`,
          title: cleanTaskText(text),
          status: 'todo',
          priority: 'high', // HEARTBEAT priorities are high
          assignee: capitalizeFirst(agentId),
          source: 'HEARTBEAT.md',
        });
      }
    }
  }

  return tasks;
}

function parsePriorityQueue(content: string, agentId: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');
  let taskCount = 0;

  for (const line of lines) {
    // Parse numbered items or bullets
    const taskMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/) || 
                     line.match(/^[-*]\s+\*\*(.+?)\*\*/) ||
                     line.match(/^\d+\.\s+(.+)/);

    if (taskMatch) {
      const text = taskMatch[1];
      if (text.length < 3) continue;

      // Higher in list = higher priority
      const priority: Task['priority'] = taskCount < 3 ? 'high' : taskCount < 6 ? 'medium' : 'low';

      tasks.push({
        id: `${agentId}-pq-${taskCount}`,
        title: cleanTaskText(text),
        status: 'todo',
        priority,
        assignee: capitalizeFirst(agentId),
        source: 'PRIORITY-QUEUE.md',
      });

      taskCount++;
    }
  }

  return tasks;
}

function cleanTaskText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/🔴|🟡|🟢/g, '')
    .replace(/URGENT|CRITICAL|LOW/gi, '')
    .trim();
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMockTasks(): Task[] {
  return [
    {
      id: 'mock-1',
      title: 'PracticeEngine Lambda fixes',
      status: 'done',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'mock-2',
      title: 'N8N Social Scheduler pipeline',
      status: 'done',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'mock-3',
      title: 'Mission Control Phase 2+3',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Forge',
      source: 'HEARTBEAT.md',
    },
    {
      id: 'mock-4',
      title: 'Swap CLI for Ultron',
      status: 'todo',
      priority: 'medium',
      assignee: 'Forge',
      source: 'PRIORITY-QUEUE.md',
    },
  ];
}
