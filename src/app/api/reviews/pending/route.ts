import { NextRequest, NextResponse } from 'next/server';
import { readNotification, clearNotification, getReviewHistory } from '@/lib/reviews';

/**
 * GET /api/reviews/pending - Captain polls for new decisions
 * 
 * Returns the latest notification (if any) and clears it.
 * Also returns recent history for context.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const peek = searchParams.get('peek') === 'true'; // Don't clear notification

    const notification = await readNotification();
    
    if (notification && !peek) {
      await clearNotification();
    }

    // Get recent decisions for context
    const recentDecisions = await getReviewHistory(10);

    return NextResponse.json({
      hasNotification: !!notification,
      notification,
      recentDecisions: recentDecisions.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        status: r.status,
        submittedBy: r.submittedBy,
        decidedAt: r.decision?.decidedAt,
        comment: r.decision?.comment,
      })),
    });

  } catch (error) {
    console.error('[Reviews API] Pending error:', error);
    return NextResponse.json({
      error: 'Failed to check pending',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
