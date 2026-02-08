import { NextRequest, NextResponse } from 'next/server';
import { seedSampleReviews, getPendingReviews } from '@/lib/reviews';

// POST /api/reviews/seed - Seed sample reviews for testing
export async function POST(request: NextRequest) {
  try {
    // Check if already seeded
    const existing = await getPendingReviews();
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Reviews already exist. Clear first to reseed.',
        existingCount: existing.length,
      });
    }

    const created = await seedSampleReviews();

    return NextResponse.json({
      success: true,
      created: created.length,
      ids: created.map(r => r.id),
      message: 'Sample reviews seeded',
    });

  } catch (error) {
    console.error('[Reviews Seed] Error:', error);
    return NextResponse.json({
      error: 'Failed to seed reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/reviews/seed - Check seed status
export async function GET(request: NextRequest) {
  try {
    const pending = await getPendingReviews();
    return NextResponse.json({
      seeded: pending.length > 0,
      pendingCount: pending.length,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check seed status',
    }, { status: 500 });
  }
}
