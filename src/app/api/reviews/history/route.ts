import { NextRequest, NextResponse } from 'next/server';
import { getReviewHistory } from '@/lib/reviews';

/**
 * GET /api/reviews/history - Get review history (decided items)
 * 
 * Query params:
 *   - limit=N - Number of items (default 50)
 *   - search=term - Search titles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search')?.toLowerCase();

    let history = await getReviewHistory(limit * 2); // Fetch extra for filtering

    // Filter by search term
    if (search) {
      history = history.filter(r => 
        r.title.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search) ||
        r.submittedBy.toLowerCase().includes(search) ||
        r.tags?.some(t => t.toLowerCase().includes(search))
      );
    }

    // Apply limit
    history = history.slice(0, limit);

    // Summary stats
    const stats = {
      total: history.length,
      approved: history.filter(r => r.status === 'approved').length,
      rejected: history.filter(r => r.status === 'rejected').length,
      changesRequested: history.filter(r => r.status === 'changes_requested').length,
    };

    return NextResponse.json({
      history,
      stats,
    });

  } catch (error) {
    console.error('[Reviews API] History error:', error);
    return NextResponse.json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
