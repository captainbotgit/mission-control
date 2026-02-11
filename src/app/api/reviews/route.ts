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

    // Validate preview URL for website/video types
    const urlToCheck = body.type === 'video' ? (body.videoUrl || body.previewUrl) : body.previewUrl;

    if (body.type === 'website' && !body.previewUrl) {
      return NextResponse.json({
        error: 'Preview URL is required for website submissions',
      }, { status: 400 });
    }

    if (body.type === 'video' && !body.videoUrl && !body.previewUrl) {
      return NextResponse.json({
        error: 'Video URL or preview URL is required for video submissions',
      }, { status: 400 });
    }

    // Validate URL format — must be https, no localhost
    const urlsToValidate = [body.previewUrl, body.videoUrl, body.contentUrl].filter(Boolean);
    for (const url of urlsToValidate) {
      if (!url.startsWith('https://')) {
        return NextResponse.json({
          error: `URL must use https://. Got: ${url}`,
        }, { status: 400 });
      }
      if (url.includes('localhost') || url.includes('127.')) {
        return NextResponse.json({
          error: `Localhost URLs are not allowed: ${url}`,
        }, { status: 400 });
      }
    }

    // Async reachability check for the primary preview/video URL
    if (urlToCheck) {
      try {
        const headRes = await fetch(urlToCheck, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (!headRes.ok) {
          return NextResponse.json({
            error: 'Preview URL is not reachable',
            url: urlToCheck,
            status: headRes.status,
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({
          error: 'Preview URL is not reachable',
          url: urlToCheck,
        }, { status: 400 });
      }
    }

    // Require content for document/copy types
    if ((body.type === 'document' || body.type === 'copy') && !body.content?.trim()) {
      return NextResponse.json({
        error: 'Content is required for document/copy submissions',
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
