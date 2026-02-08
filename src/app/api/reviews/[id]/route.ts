import { NextRequest, NextResponse } from 'next/server';
import { getReviewById, updateReviewDecision, ReviewStatus } from '@/lib/reviews';

/**
 * GET /api/reviews/[id] - Get a specific review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await getReviewById(id);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ review });

  } catch (error) {
    console.error('[Reviews API] GET by ID error:', error);
    return NextResponse.json({
      error: 'Failed to fetch review',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews/[id] - Update a review decision
 * 
 * Body:
 * {
 *   status: 'approved' | 'rejected' | 'changes_requested',
 *   comment?: string,
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate status
    const validStatuses: ReviewStatus[] = ['approved', 'rejected', 'changes_requested', 'pending'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({
        error: 'Invalid status',
        validStatuses,
      }, { status: 400 });
    }

    const review = await updateReviewDecision(id, body.status, body.comment);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review,
      message: `Review ${body.status}`,
    });

  } catch (error) {
    console.error('[Reviews API] PATCH error:', error);
    return NextResponse.json({
      error: 'Failed to update review',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
