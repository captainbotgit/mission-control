import { NextRequest, NextResponse } from 'next/server';
import { 
  getReviews, 
  getPendingReviews, 
  addReview, 
  ReviewItem, 
  ReviewType 
} from '@/lib/reviews';

/**
 * GET /api/reviews - Get all reviews or pending only
 * Query params:
 *   - pending=true - Only return pending reviews
 *   - limit=N - Limit results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pendingOnly = searchParams.get('pending') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (pendingOnly) {
      const pending = await getPendingReviews();
      return NextResponse.json({
        reviews: pending.slice(0, limit),
        count: pending.length,
      });
    }

    const store = await getReviews();
    return NextResponse.json({
      reviews: store.reviews.slice(0, limit),
      count: store.reviews.length,
      lastUpdated: store.lastUpdated,
    });

  } catch (error) {
    console.error('[Reviews API] GET error:', error);
    return NextResponse.json({
      error: 'Failed to fetch reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/reviews - Submit a new item for review
 * 
 * Body:
 * {
 *   title: string,
 *   description?: string,
 *   type: 'document' | 'copy' | 'image' | 'website' | 'video' | 'code' | 'other',
 *   content?: string,
 *   contentUrl?: string,
 *   imageUrl?: string,
 *   videoUrl?: string,
 *   previewUrl?: string,
 *   submittedBy: string,
 *   priority?: 'high' | 'medium' | 'low',
 *   tags?: string[],
 *   captainRecommendation?: 'approved' | 'rejected' | 'changes_requested',
 *   captainNotes?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.type || !body.submittedBy) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['title', 'type', 'submittedBy'],
      }, { status: 400 });
    }

    // Validate type
    const validTypes: ReviewType[] = ['document', 'copy', 'image', 'website', 'video', 'code', 'other'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({
        error: 'Invalid type',
        validTypes,
      }, { status: 400 });
    }

    // Create review
    const review = await addReview({
      title: body.title,
      description: body.description,
      type: body.type,
      content: body.content,
      contentUrl: body.contentUrl,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      previewUrl: body.previewUrl,
      filePath: body.filePath,
      submittedBy: body.submittedBy,
      priority: body.priority || 'medium',
      tags: body.tags,
      captainRecommendation: body.captainRecommendation,
      captainNotes: body.captainNotes,
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Review submitted successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('[Reviews API] POST error:', error);
    return NextResponse.json({
      error: 'Failed to submit review',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
