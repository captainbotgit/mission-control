#!/usr/bin/env npx tsx
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";

const SUPABASE_URL = "https://pzxgtfzqhqzhfwajqhpq.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eGd0ZnpxaHF6aGZ3YWpxaHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA5ODEwMSwiZXhwIjoyMDg1Njc0MTAxfQ.j_ZiezWdKhb5dqvqBL3myfehaZlu-ti4vCgraYpRTgA";
const AGENTS_DIR = "/Users/blakeai/.openclaw/agents";

const FALLBACK: Record<string, { name: string; emoji: string; role: string }> = {
  devops: { name: "Forge", emoji: "⚙️", role: "CTO / DevOps" },
  main: { name: "Captain", emoji: "🎖️", role: "Fleet Commander" },
  trading: { name: "Trading", emoji: "📈", role: "Financial Operations" },
  research: { name: "Research", emoji: "🔬", role: "Research & Analysis" },
  video: { name: "Dr. Strange", emoji: "🎬", role: "Video Production" },
  "dental-marketing": { name: "Pepper", emoji: "🦷", role: "Dental Marketing" },
  gop: { name: "Reagan", emoji: "🇺🇸", role: "Political Analysis" },
  icheadcam: { name: "Vision", emoji: "👁️", role: "Visual Intelligence" },
  "executive-assistant": { name: "Friday", emoji: "📋", role: "Executive Support" },
};

function hashId(s: string): string {
  return createHash("md5").update(s).digest("hex").slice(0, 12);
}

async function readSafe(path: string): Promise<string | null> {
  try { return await readFile(path, "utf-8"); } catch { return null; }
}

async function lsSafe(path: string): Promise<string[]> {
  try { return await readdir(path); } catch { return []; }
}

async function supabaseUpsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`  ❌ ${table} upsert failed: ${res.status} ${t}`);
  } else {
    console.log(`  ✅ ${table}: ${rows.length} rows upserted`);
  }
}

function classifyActivity(line: string): string {
  const l = line.toLowerCase();
  if (/deploy|ship/.test(l)) return "deploy";
  if (/commit|push|wrote/.test(l)) return "commit";
  if (/critical|fix/.test(l)) return "alert";
  if (/completed|done/.test(l)) return "task";
  return "message";
}

// Map priority from P0/P1/P2 to the DB enum (critical/high/medium/low)
function mapPriority(p: string): string {
  if (p === "0" || p === "1") return "high";
  return "medium";
}

function parseTasks(heartbeat: string, agentId: string, agentName: string): any[] {
  const tasks: any[] = [];
  const sections = heartbeat.split(/^## /m);

  for (const section of sections) {
    if (section.startsWith("OPEN TASKS")) {
      const taskBlocks = section.split(/^### /m).slice(1);
      for (const block of taskBlocks) {
        const firstLine = block.split("\n")[0].trim();
        // Extract task code like T005
        const codeMatch = firstLine.match(/^(T\d+)\s*[—–-]\s*/);
        const title = firstLine
          .replace(/^T\d+\s*[—–-]\s*/, "")
          .replace(/\s*\(.*?\)\s*/g, " ")
          .trim();
        const priority = firstLine.match(/P(\d)/)?.[1] ?? "2";
        const id = codeMatch ? `task-${agentId}-${codeMatch[1].toLowerCase()}` : `task-${hashId(`${agentId}-${title}`)}`;
        tasks.push({
          id,
          title: title.slice(0, 200),
          status: "in-progress",
          priority: mapPriority(priority),
          assignee: agentName,
          source: "HEARTBEAT.md",
          agent_id: agentId,
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (section.startsWith("DONE")) {
      const lines = section.split("\n").filter((l) => l.includes("✅"));
      for (const line of lines) {
        const text = line.replace(/^.*?✅\s*/, "").replace(/^\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\s*/, "").trim();
        if (!text) continue;
        tasks.push({
          id: `task-${hashId(`${agentId}-done-${text.slice(0, 50)}`)}`,
          title: text.slice(0, 200),
          status: "done",
          priority: "medium",
          assignee: agentName,
          source: "HEARTBEAT.md",
          agent_id: agentId,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
  return tasks;
}

function parseActivities(content: string, date: string, agentId: string, agentName: string, agentEmoji: string): any[] {
  const activities: any[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const m = line.match(/^[\-\*]\s+(.+)/);
    if (!m) continue;
    const text = m[1].trim();
    if (text.length < 5) continue;
    const timeMatch = text.match(/(\d{1,2}:\d{2})/);
    const timestamp = timeMatch ? `${date}T${timeMatch[1].padStart(5, "0")}:00Z` : `${date}T12:00:00Z`;
    activities.push({
      id: `act-${hashId(`${agentId}-${date}-${text.slice(0, 100)}`)}`,
      agent_id: agentId,
      agent_name: agentName,
      agent_emoji: agentEmoji,
      action: text.slice(0, 200),
      details: text.length > 200 ? text.slice(200, 500) : null,
      type: classifyActivity(text),
      timestamp,
    });
  }
  return activities;
}

async function main() {
  console.log("🔄 Syncing agent data to Supabase...\n");
  const agentDirs = await readdir(AGENTS_DIR);
  const allAgents: any[] = [];
  const allTasks: any[] = [];
  const allActivities: any[] = [];

  const now = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  for (const id of agentDirs) {
    const agentPath = join(AGENTS_DIR, id);
    const s = await stat(agentPath);
    if (!s.isDirectory()) continue;

    const workspace = join(agentPath, "workspace");
    const fb = FALLBACK[id] ?? { name: id, emoji: "🤖", role: "Agent" };
    let name = fb.name, emoji = fb.emoji, role = fb.role;

    // Memory files
    const memDir = join(workspace, "memory");
    const memFiles = await lsSafe(memDir);
    const memDates = memFiles.filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map((f) => f.replace(".md", "")).sort();
    const lastMemDate = memDates.at(-1);

    // Status
    let status = "offline";
    if (lastMemDate) {
      const diffDays = (now.getTime() - new Date(lastMemDate + "T23:59:59Z").getTime()) / 86400000;
      if (diffDays <= 1) status = "active";
      else if (diffDays <= 3) status = "idle";
    }

    allAgents.push({
      id,
      name,
      emoji,
      status,
      role,
      last_activity: lastMemDate ? `${lastMemDate}T23:59:59Z` : null,
      memory_files: memDates.length,
    });

    // Heartbeat tasks
    const heartbeat = await readSafe(join(workspace, "HEARTBEAT.md"));
    if (heartbeat) {
      allTasks.push(...parseTasks(heartbeat, id, name));
    }

    // Activities from last 7 days
    for (const date of last7) {
      const content = await readSafe(join(memDir, `${date}.md`));
      if (content) {
        allActivities.push(...parseActivities(content, date, id, name, emoji));
      }
    }

    console.log(`📦 ${emoji} ${name} (${id}): status=${status}, tasks=${allTasks.filter(t=>t.agent_id===id).length}, activities=${allActivities.filter(a=>a.agent_id===id).length}`);
  }

  // Deduplicate by id
  const dedup = (arr: any[]) => [...new Map(arr.map(r => [r.id, r])).values()];
  const dedupTasks = dedup(allTasks);
  const dedupActivities = dedup(allActivities);

  console.log("");
  await supabaseUpsert("dashboard_agents", allAgents);
  await supabaseUpsert("dashboard_tasks", dedupTasks);
  // Batch activities in chunks of 500 to avoid payload limits
  for (let i = 0; i < dedupActivities.length; i += 500) {
    await supabaseUpsert("dashboard_activities", dedupActivities.slice(i, i + 500));
  }

  console.log(`\n✨ Sync complete: ${allAgents.length} agents, ${allTasks.length} tasks, ${allActivities.length} activities`);
}

main().catch((e) => { console.error(e); process.exit(1); });
