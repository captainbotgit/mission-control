import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_BASE = '/Users/blakeai/.openclaw/agents';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ActivityItem {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'task' | 'commit' | 'message' | 'alert' | 'deploy';
}

const AGENT_META: Record<string, { name: string; emoji: string }> = {
  'devops': { name: 'Forge', emoji: '⚙️' },
  'main': { name: 'Captain', emoji: '🎖️' },
  'trading': { name: 'Trading', emoji: '📈' },
  'research': { name: 'Research', emoji: '🔬' },
  'video': { name: 'Dr. Strange', emoji: '🎬' },
  'dental-marketing': { name: 'Pepper', emoji: '🦷' },
  'gop': { name: 'Reagan', emoji: '🇺🇸' },
  'icheadcam': { name: 'Vision', emoji: '👁️' },
};

function classifyAction(text: string): ActivityItem['type'] {
  const lower = text.toLowerCase();
  if (lower.includes('deploy') || lower.includes('shipped') || lower.includes('pushed') || lower.includes('live')) return 'deploy';
  if (lower.includes('commit') || lower.includes('built') || lower.includes('created') || lower.includes('fixed') || lower.includes('wrote')) return 'commit';
  if (lower.includes('alert') || lower.includes('error') || lower.includes('warning') || lower.includes('broke')) return 'alert';
  if (lower.includes('message') || lower.includes('asked') || lower.includes('told') || lower.includes('said')) return 'message';
  return 'task';
}

function parseMemoryFile(filePath: string, date: string, agentId: string): ActivityItem[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const items: ActivityItem[] = [];
    const meta = AGENT_META[agentId] || { name: agentId, emoji: '🤖' };
    let currentSection = '';
    let itemIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.replace(/^##\s+/, '');
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        const text = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
        if (text.length < 5) continue;

        const timeMatch = text.match(/^(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*[-–—:]\s*/i);
        let timestamp = `${date}T12:00:00`;
        let action = text;

        if (timeMatch) {
          action = text.slice(timeMatch[0].length);
          const timePart = timeMatch[1];
          timestamp = `${date}T${timePart.replace(/\s*[AP]M/i, '')}:00`;
        } else {
          const hour = Math.min(8 + itemIndex, 23);
          timestamp = `${date}T${String(hour).padStart(2, '0')}:${String(itemIndex % 60).padStart(2, '0')}:00`;
        }

        items.push({
          id: `${agentId}-${date}-${itemIndex}`,
          agent: meta.name,
          agentEmoji: meta.emoji,
          action: action.slice(0, 200),
          details: currentSection || '',
          timestamp,
          type: classifyAction(action),
        });
        itemIndex++;
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const days = parseInt(searchParams.get('days') || '7');

  // 1. Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_activities?select=*&order=timestamp.desc&limit=${limit}`,
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
        const activities: ActivityItem[] = data.map((row: any) => ({
          id: row.id,
          agent: row.agent_name || row.agent_id,
          agentEmoji: row.agent_emoji || '🤖',
          action: row.action,
          details: row.details || '',
          timestamp: row.timestamp,
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

  // 2. Filesystem fallback (local dev)
  try {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dates.push(d.toISOString().split('T')[0]);
    }

    const allActivities: ActivityItem[] = [];

    const agents = fs.readdirSync(AGENTS_BASE, { withFileTypes: true })
      .filter(e => e.isDirectory());

    for (const agent of agents) {
      const memoryDir = path.join(AGENTS_BASE, agent.name, 'workspace', 'memory');
      if (!fs.existsSync(memoryDir)) continue;

      for (const date of dates) {
        const filePath = path.join(memoryDir, `${date}.md`);
        if (fs.existsSync(filePath)) {
          allActivities.push(...parseMemoryFile(filePath, date, agent.name));
        }
      }
    }

    allActivities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return NextResponse.json({
      activities: allActivities.slice(0, limit),
      source: 'filesystem',
      total: allActivities.length,
    });
  } catch (e) {
    console.error('[Activity API] Filesystem error:', e);
  }

  // 3. Empty response
  return NextResponse.json({ activities: [], source: 'none', total: 0 });
}
