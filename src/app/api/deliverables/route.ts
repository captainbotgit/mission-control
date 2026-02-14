/**
 * Deliverables API — Mission Control
 *
 * GET  /api/deliverables — List all deliverables (with optional status filter)
 * POST /api/deliverables — Submit a new deliverable for review
 *
 * Auth: Bearer token via middleware
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: List deliverables
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  let query = supabase
    .from("dashboard_deliverables")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch deliverables", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deliverables: data || [],
    count: data?.length || 0,
  });
}

// POST: Submit a new deliverable
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, agentId, agentName, taskId, type, prUrl, deployUrl, screenshotUrl, branch, filesChanged } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dashboard_deliverables")
    .insert({
      title,
      description: description || null,
      agent_id: agentId,
      agent_name: agentName || agentId,
      task_id: taskId || null,
      type: type || "feature",
      pr_url: prUrl || null,
      deploy_url: deployUrl || null,
      screenshot_url: screenshotUrl || null,
      branch: branch || null,
      files_changed: filesChanged || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create deliverable", details: error.message },
      { status: 500 }
    );
  }

  // Log submission to audit trail
  await supabase
    .from("dashboard_approval_log")
    .insert({
      deliverable_id: data.id,
      action: "submitted",
      actor: (agentName as string) || (agentId as string),
      notes: `Submitted: ${title}`,
    });

  // Log to activity feed
  await supabase
    .from("dashboard_activities")
    .insert({
      id: `submit-${data.id}`,
      agent_id: agentId as string,
      agent_name: (agentName as string) || (agentId as string),
      agent_emoji: "🔨",
      action: `Submitted for review: ${title}`,
      details: (prUrl as string) || (description as string) || null,
      type: "task",
      timestamp: new Date().toISOString(),
    });

  return NextResponse.json({
    success: true,
    deliverable: data,
  }, { status: 201 });
}
