/**
 * Approval Webhook — Mission Control
 *
 * POST /api/webhooks/approve
 *
 * Handles deliverable approvals/rejections from Blake's dashboard.
 * Logs the action to Supabase and fires an N8N webhook.
 *
 * Auth: Bearer token (API_SECRET or DASHBOARD_TOKEN via middleware)
 *
 * Request body:
 * {
 *   deliverableId: string (UUID)
 *   status: "approved" | "rejected" | "revision_requested"
 *   notes?: string
 *   approvedBy?: string (defaults to "blake")
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// N8N webhook URL — configured via env var
const N8N_WEBHOOK_URL = process.env.N8N_APPROVAL_WEBHOOK_URL;

interface ApprovalRequest {
  deliverableId: string;
  status: "approved" | "rejected" | "revision_requested";
  notes?: string;
  approvedBy?: string;
}

// Validate the request body
function validateRequest(body: unknown): { valid: true; data: ApprovalRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const { deliverableId, status, notes, approvedBy } = body as Record<string, unknown>;

  if (!deliverableId || typeof deliverableId !== "string") {
    return { valid: false, error: "deliverableId is required and must be a string" };
  }

  const validStatuses = ["approved", "rejected", "revision_requested"];
  if (!status || !validStatuses.includes(status as string)) {
    return { valid: false, error: `status must be one of: ${validStatuses.join(", ")}` };
  }

  if (notes !== undefined && typeof notes !== "string") {
    return { valid: false, error: "notes must be a string" };
  }

  if (approvedBy !== undefined && typeof approvedBy !== "string") {
    return { valid: false, error: "approvedBy must be a string" };
  }

  return {
    valid: true,
    data: {
      deliverableId: deliverableId as string,
      status: status as ApprovalRequest["status"],
      notes: notes as string | undefined,
      approvedBy: (approvedBy as string) || "blake",
    },
  };
}

// Fire N8N webhook
async function fireN8NWebhook(payload: {
  deliverableId: string;
  status: string;
  notes?: string;
  approvedBy: string;
  deliverable: Record<string, unknown>;
  timestamp: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!N8N_WEBHOOK_URL) {
    console.log("[Approval Webhook] N8N_APPROVAL_WEBHOOK_URL not configured — skipping webhook");
    return { success: false, error: "N8N webhook URL not configured" };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Approval Webhook] N8N responded ${response.status}: ${text}`);
      return { success: false, error: `N8N responded ${response.status}` };
    }

    console.log("[Approval Webhook] N8N webhook fired successfully");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Approval Webhook] N8N webhook failed:", message);
    return { success: false, error: message };
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate
  const validation = validateRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { deliverableId, status, notes, approvedBy } = validation.data;

  // 1. Fetch the deliverable
  const { data: deliverable, error: fetchError } = await supabase
    .from("dashboard_deliverables")
    .select("*")
    .eq("id", deliverableId)
    .single();

  if (fetchError || !deliverable) {
    return NextResponse.json(
      { error: `Deliverable not found: ${deliverableId}` },
      { status: 404 }
    );
  }

  // 2. Update deliverable status
  const updateData: Record<string, unknown> = {
    status,
    approved_by: approvedBy,
    approval_notes: notes || null,
    updated_at: timestamp,
  };

  if (status === "approved") {
    updateData.approved_at = timestamp;
  }

  const { error: updateError } = await supabase
    .from("dashboard_deliverables")
    .update(updateData)
    .eq("id", deliverableId);

  if (updateError) {
    console.error("[Approval Webhook] Update failed:", updateError);
    return NextResponse.json(
      { error: "Failed to update deliverable", details: updateError.message },
      { status: 500 }
    );
  }

  // 3. Log the approval action
  const { error: logError } = await supabase
    .from("dashboard_approval_log")
    .insert({
      deliverable_id: deliverableId,
      action: status === "revision_requested" ? "revision_requested" : status,
      actor: approvedBy,
      notes: notes || null,
    });

  if (logError) {
    console.error("[Approval Webhook] Audit log failed:", logError);
    // Non-fatal — don't fail the request
  }

  // 4. Log to dashboard_activities feed
  const actionText = status === "approved"
    ? `Approved: ${deliverable.title}`
    : status === "rejected"
    ? `Rejected: ${deliverable.title}`
    : `Requested revision: ${deliverable.title}`;

  await supabase
    .from("dashboard_activities")
    .insert({
      id: `approval-${deliverableId}-${Date.now()}`,
      agent_id: "blake",
      agent_name: approvedBy,
      agent_emoji: "👤",
      action: actionText,
      details: notes || null,
      type: "task",
      timestamp,
    })
    .then(({ error }) => {
      if (error) console.error("[Approval Webhook] Activity log failed:", error);
    });

  // 5. Fire N8N webhook
  const n8nResult = await fireN8NWebhook({
    deliverableId,
    status,
    notes,
    approvedBy: approvedBy!,
    deliverable,
    timestamp,
  });

  // 6. Record N8N webhook status
  if (n8nResult.success) {
    await supabase
      .from("dashboard_deliverables")
      .update({
        n8n_webhook_fired: true,
        n8n_webhook_fired_at: timestamp,
      })
      .eq("id", deliverableId);
  }

  return NextResponse.json({
    success: true,
    deliverableId,
    status,
    approvedBy,
    notes: notes || null,
    n8nWebhook: n8nResult.success ? "fired" : "skipped",
    n8nError: n8nResult.error || undefined,
    timestamp,
  });
}

// GET endpoint for checking webhook health
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/approve",
    method: "POST",
    n8nConfigured: !!N8N_WEBHOOK_URL,
    requiredFields: {
      deliverableId: "string (UUID)",
      status: "approved | rejected | revision_requested",
      notes: "string (optional)",
      approvedBy: "string (optional, defaults to 'blake')",
    },
    auth: "Bearer token required (API_SECRET or DASHBOARD_TOKEN)",
  });
}
