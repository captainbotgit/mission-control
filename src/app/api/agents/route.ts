import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// API: Get agent list and status from filesystem
// Reads from ~/.openclaw/agents/

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  status: 'active' | 'idle' | 'offline';
  lastActivity: string | null;
  memoryFiles: number;
  workspacePath: string;
}

const AGENTS_DIR = process.env.AGENTS_DIR || path.join(process.env.HOME || '', '.openclaw', 'agents');

export async function GET(request: NextRequest) {
  try {
    const agents: AgentInfo[] = [];

    // Read agents directory
    let agentDirs: string[] = [];
    try {
      agentDirs = await fs.readdir(AGENTS_DIR);
    } catch (e) {
      // Fallback to mock data if directory doesn't exist
      return NextResponse.json({
        agents: getMockAgents(),
        source: 'mock',
        message: 'Agents directory not accessible, using mock data',
      });
    }

    for (const agentId of agentDirs) {
      const agentPath = path.join(AGENTS_DIR, agentId);
      const stat = await fs.stat(agentPath).catch(() => null);

      if (!stat?.isDirectory()) continue;

      // Read IDENTITY.md or SOUL.md for agent info
      let name = agentId;
      let emoji = '🤖';

      const identityPath = path.join(agentPath, 'workspace', 'IDENTITY.md');
      const soulPath = path.join(agentPath, 'workspace', 'SOUL.md');

      try {
        const identity = await fs.readFile(identityPath, 'utf-8');
        const nameMatch = identity.match(/\*\*Name:\*\*\s*(.+)/);
        const emojiMatch = identity.match(/\*\*Emoji:\*\*\s*(.+)/);
        if (nameMatch) name = nameMatch[1].trim();
        if (emojiMatch) emoji = emojiMatch[1].trim();
      } catch {
        // Try SOUL.md as fallback
        try {
          const soul = await fs.readFile(soulPath, 'utf-8');
          // Extract name from first heading or title
          const titleMatch = soul.match(/^#\s+(.+)/m);
          if (titleMatch) {
            name = titleMatch[1].replace(/SOUL\.md.*/, '').trim();
          }
        } catch {
          // Use folder name
        }
      }

      // Count memory files
      const memoryPath = path.join(agentPath, 'workspace', 'memory');
      let memoryFiles = 0;
      try {
        const files = await fs.readdir(memoryPath);
        memoryFiles = files.filter(f => f.endsWith('.md')).length;
      } catch {
        // No memory directory
      }

      // Check last activity from most recent memory file
      let lastActivity: string | null = null;
      try {
        const files = await fs.readdir(memoryPath);
        const mdFiles = files.filter(f => f.match(/\d{4}-\d{2}-\d{2}\.md$/));
        if (mdFiles.length > 0) {
          mdFiles.sort().reverse();
          lastActivity = mdFiles[0].replace('.md', '');
        }
      } catch {
        // No activity data
      }

      // Determine status based on last activity
      let status: 'active' | 'idle' | 'offline' = 'offline';
      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const now = new Date();
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 1) status = 'active';
        else if (diffHours < 24) status = 'idle';
        else status = 'offline';
      }

      agents.push({
        id: agentId,
        name: capitalizeFirst(name),
        emoji,
        status,
        lastActivity,
        memoryFiles,
        workspacePath: path.join(agentPath, 'workspace'),
      });
    }

    // Sort by status (active first, then idle, then offline)
    const statusOrder = { active: 0, idle: 1, offline: 2 };
    agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return NextResponse.json({
      agents,
      source: 'filesystem',
      agentsDir: AGENTS_DIR,
      count: agents.length,
    });

  } catch (error) {
    console.error('[Agents API] Error:', error);
    return NextResponse.json({
      agents: getMockAgents(),
      source: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMockAgents(): AgentInfo[] {
  return [
    {
      id: 'forge',
      name: 'Forge',
      emoji: '⚙️',
      status: 'active',
      lastActivity: new Date().toISOString().split('T')[0],
      memoryFiles: 12,
      workspacePath: '/mock/forge',
    },
    {
      id: 'captain',
      name: 'Captain',
      emoji: '🎖️',
      status: 'active',
      lastActivity: new Date().toISOString().split('T')[0],
      memoryFiles: 8,
      workspacePath: '/mock/captain',
    },
    {
      id: 'friday',
      name: 'Friday',
      emoji: '📚',
      status: 'idle',
      lastActivity: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      memoryFiles: 5,
      workspacePath: '/mock/friday',
    },
  ];
}
