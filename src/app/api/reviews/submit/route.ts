import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateReviews, writeNotification, ReviewStatus } from '@/lib/reviews';

/**
 * POST /api/reviews/submit - Submit batch review decisions
 * 
 * Body:
 * {
 *   decisions: [
 *     { id: string, status: 'approved' | 'rejected' | 'changes_requested', comment?: string }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.decisions || !Array.isArray(body.decisions)) {
      return NextResponse.json({
        error: 'Missing decisions array',
        expected: { decisions: [{ id: 'string', status: 'string', comment: 'string?' }] },
      }, { status: 400 });
    }

    // Validate each decision
    const validStatuses: ReviewStatus[] = ['approved', 'rejected', 'changes_requested'];
    for (const decision of body.decisions) {
      if (!decision.id || !decision.status) {
        return NextResponse.json({
          error: 'Each decision must have id and status',
        }, { status: 400 });
      }
      if (!validStatuses.includes(decision.status)) {
        return NextResponse.json({
          error: `Invalid status: ${decision.status}`,
          validStatuses,
        }, { status: 400 });
      }
    }

    // Apply decisions
    const updated = await batchUpdateReviews(body.decisions);

    // Write notification for Captain
    await writeNotification(
      `Blake submitted ${updated.length} review decisions`,
      updated
    );

    // Summary
    const summary = {
      approved: updated.filter(r => r.status === 'approved').length,
      rejected: updated.filter(r => r.status === 'rejected').length,
      changesRequested: updated.filter(r => r.status === 'changes_requested').length,
    };

    return NextResponse.json({
      success: true,
      updated: updated.length,
      summary,
      message: `Submitted ${updated.length} review decisions`,
      notificationWritten: true,
    });

  } catch (error) {
    console.error('[Reviews API] Submit error:', error);
    return NextResponse.json({
      error: 'Failed to submit reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
