import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_BASE = '/Users/blakeai/.openclaw/agents';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Known agent metadata (fallback when SOUL.md parsing fails)
const KNOWN_AGENTS: Record<string, { name: string; emoji: string; role?: string }> = {
  'devops': { name: 'Forge', emoji: '⚙️', role: 'CTO / DevOps' },
  'main': { name: 'Captain', emoji: '🎖️', role: 'Fleet Commander' },
  'trading': { name: 'Trading', emoji: '📈', role: 'Financial Operations' },
  'research': { name: 'Research', emoji: '🔬', role: 'Research & Analysis' },
  'video': { name: 'Dr. Strange', emoji: '🎬', role: 'Video Production' },
  'dental-marketing': { name: 'Pepper', emoji: '🦷', role: 'Dental Marketing' },
  'gop': { name: 'Reagan', emoji: '🇺🇸', role: 'Political Analysis' },
  'icheadcam': { name: 'Vision', emoji: '👁️', role: 'Visual Intelligence' },
};

function parseAgentName(agentDir: string, agentId: string): { name: string; emoji: string; role?: string } {
  // Check IDENTITY.md first
  const identityPath = path.join(agentDir, 'agent', 'IDENTITY.md');
  if (fs.existsSync(identityPath)) {
    const content = fs.readFileSync(identityPath, 'utf-8');
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const emojiMatch = content.match(/\*\*Creature:\*\*\s*(.+)/);
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        emoji: KNOWN_AGENTS[agentId]?.emoji || '🤖',
        role: emojiMatch ? emojiMatch[1].trim().slice(0, 50) : undefined,
      };
    }
  }

  // Check SOUL.md
  const soulPath = path.join(agentDir, 'agent', 'SOUL.md');
  if (fs.existsSync(soulPath)) {
    const content = fs.readFileSync(soulPath, 'utf-8').slice(0, 2000);
    const headerMatch = content.match(/^#\s+SOUL\.md\s*[-–—]\s*(.+)/m);
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const youAreMatch = content.match(/You(?:'re| are)(?: the)?\s+\*\*([^*]+)\*\*/);

    const name = nameMatch?.[1]?.trim() || headerMatch?.[1]?.trim() || youAreMatch?.[1]?.trim();
    if (name) {
      return {
        name,
        emoji: KNOWN_AGENTS[agentId]?.emoji || '🤖',
        role: KNOWN_AGENTS[agentId]?.role,
      };
    }
  }

  return KNOWN_AGENTS[agentId] || {
    name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    emoji: '🤖',
  };
}

function getMemoryInfo(agentDir: string): { count: number; lastActivity: string | null } {
  const memoryDir = path.join(agentDir, 'workspace', 'memory');
  if (!fs.existsSync(memoryDir)) {
    return { count: 0, lastActivity: null };
  }

  try {
    const files = fs.readdirSync(memoryDir)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();

    return {
      count: files.length,
      lastActivity: files[0]?.replace('.md', '') || null,
    };
  } catch {
    return { count: 0, lastActivity: null };
  }
}

function determineStatus(lastActivity: string | null): 'active' | 'idle' | 'offline' {
  if (!lastActivity) return 'offline';
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  if (lastActivity === today) return 'active';
  if (lastActivity === yesterday) return 'idle';
  return 'offline';
}

export async function GET(_request: NextRequest) {
  // 1. Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_agents?select=*&order=status.asc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          next: { revalidate: 30 },
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
          lastActivity: row.last_activity ? row.last_activity.split('T')[0] : null,
          memoryFiles: row.memory_files || 0,
          workspacePath: row.workspace_path || '',
        }));

        const statusOrder: Record<string, number> = { active: 0, idle: 1, offline: 2 };
        agents.sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));

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

  // 2. Filesystem fallback (local dev)
  try {
    const entries = fs.readdirSync(AGENTS_BASE, { withFileTypes: true })
      .filter(e => e.isDirectory());

    const agents: AgentInfo[] = entries.map(entry => {
      const agentDir = path.join(AGENTS_BASE, entry.name);
      const meta = parseAgentName(agentDir, entry.name);
      const memory = getMemoryInfo(agentDir);
      const status = determineStatus(memory.lastActivity);

      return {
        id: entry.name,
        name: meta.name,
        emoji: meta.emoji,
        status,
        role: meta.role,
        lastActivity: memory.lastActivity,
        memoryFiles: memory.count,
        workspacePath: path.join(agentDir, 'workspace'),
      };
    });

    const statusOrder: Record<string, number> = { active: 0, idle: 1, offline: 2 };
    agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return NextResponse.json({
      agents,
      source: 'filesystem',
      count: agents.length,
    });
  } catch (e) {
    console.error('[Agents API] Filesystem error:', e);
  }

  // 3. Empty response
  return NextResponse.json({ agents: [], source: 'none', count: 0 });
}
