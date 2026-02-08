import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// API: Get recent activity from agent memory files
// Parses markdown files from ~/.openclaw/agents/{agent}/workspace/memory/

interface ActivityItem {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'task' | 'commit' | 'message' | 'alert' | 'deploy';
}

const AGENTS_DIR = process.env.AGENTS_DIR || path.join(process.env.HOME || '', '.openclaw', 'agents');

// Agent emoji mappings
const AGENT_EMOJIS: Record<string, string> = {
  forge: '⚙️',
  devops: '⚙️',
  captain: '🎖️',
  main: '🎖️',
  friday: '📚',
  research: '📚',
  pepper: '🌶️',
  'dental-marketing': '🦷',
  ultron: '🤖',
  trading: '📈',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const agentFilter = searchParams.get('agent');

    const activities: ActivityItem[] = [];

    // Read agents directory
    let agentDirs: string[] = [];
    try {
      agentDirs = await fs.readdir(AGENTS_DIR);
    } catch (e) {
      return NextResponse.json({
        activities: getMockActivities(),
        source: 'mock',
      });
    }

    for (const agentId of agentDirs) {
      if (agentFilter && agentId !== agentFilter) continue;

      const memoryPath = path.join(AGENTS_DIR, agentId, 'workspace', 'memory');

      try {
        const files = await fs.readdir(memoryPath);
        const mdFiles = files
          .filter(f => f.match(/\d{4}-\d{2}-\d{2}\.md$/))
          .sort()
          .reverse()
          .slice(0, 3); // Last 3 days

        for (const file of mdFiles) {
          const filePath = path.join(memoryPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const dateStr = file.replace('.md', '');

          // Parse activities from markdown
          const parsed = parseMemoryFile(content, agentId, dateStr);
          activities.push(...parsed);
        }
      } catch {
        // No memory files for this agent
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    const limited = activities.slice(0, limit);

    return NextResponse.json({
      activities: limited,
      source: 'filesystem',
      total: activities.length,
    });

  } catch (error) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json({
      activities: getMockActivities(),
      source: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function parseMemoryFile(content: string, agentId: string, dateStr: string): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const lines = content.split('\n');
  const agentName = capitalizeFirst(agentId);
  const emoji = AGENT_EMOJIS[agentId.toLowerCase()] || '🤖';

  let currentSection = '';
  let itemCount = 0;

  for (const line of lines) {
    // Track section headers
    if (line.startsWith('## ') || line.startsWith('### ')) {
      currentSection = line.replace(/^#+\s*/, '').toLowerCase();
      continue;
    }

    // Parse list items
    if (line.match(/^[-*]\s+\[.\]\s+/) || line.match(/^[-*]\s+\*\*/) || line.match(/^\d+\.\s+/)) {
      const text = line.replace(/^[-*\d.]+\s*\[.\]\s*/, '').replace(/^[-*\d.]+\s*/, '').trim();

      if (text.length < 10) continue; // Skip short items

      // Determine activity type
      let type: ActivityItem['type'] = 'task';
      const lowerText = text.toLowerCase();

      if (lowerText.includes('deploy') || lowerText.includes('shipped') || lowerText.includes('live')) {
        type = 'deploy';
      } else if (lowerText.includes('commit') || lowerText.includes('push') || lowerText.includes('pr')) {
        type = 'commit';
      } else if (lowerText.includes('alert') || lowerText.includes('error') || lowerText.includes('fix')) {
        type = 'alert';
      } else if (lowerText.includes('message') || lowerText.includes('chat') || lowerText.includes('said')) {
        type = 'message';
      }

      // Extract action and details
      let action = text;
      let details = '';

      // Look for markdown bold as action
      const boldMatch = text.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        action = boldMatch[1];
        details = text.replace(boldMatch[0], '').replace(/^[:\s-]+/, '').trim();
      } else if (text.includes(' — ')) {
        const parts = text.split(' — ');
        action = parts[0];
        details = parts.slice(1).join(' — ');
      } else if (text.includes(': ')) {
        const parts = text.split(': ');
        action = parts[0];
        details = parts.slice(1).join(': ');
      }

      // Create timestamp (spread items throughout the day)
      const baseDate = new Date(dateStr);
      baseDate.setHours(9 + Math.floor(itemCount / 4), (itemCount % 4) * 15, 0, 0);

      activities.push({
        id: `${agentId}-${dateStr}-${itemCount}`,
        agent: agentName,
        agentEmoji: emoji,
        action: cleanText(action),
        details: cleanText(details),
        timestamp: baseDate,
        type,
      });

      itemCount++;
    }
  }

  return activities;
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Replace markdown links
    .replace(/^\s*[-*]\s*/, '')
    .trim();
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
      action: 'Completed security audit',
      details: 'ClawdBar security fixes deployed',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      type: 'deploy',
    },
    {
      id: 'mock-2',
      agent: 'Forge',
      agentEmoji: '⚙️',
      action: 'Created plan document',
      details: 'PracticeEngine Update Plan',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000),
      type: 'task',
    },
    {
      id: 'mock-3',
      agent: 'Captain',
      agentEmoji: '🎖️',
      action: 'Assigned priorities',
      details: 'Sunday deadline set',
      timestamp: new Date(now.getTime() - 120 * 60 * 1000),
      type: 'message',
    },
  ];
}
