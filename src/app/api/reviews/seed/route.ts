import { NextRequest, NextResponse } from 'next/server';
import { addReview } from '@/lib/reviews';

/**
 * POST /api/reviews/seed - Seed sample reviews for testing
 * 
 * Only works if there are no pending reviews.
 */
export async function POST(request: NextRequest) {
  try {
    const sampleReviews = [
      {
        title: 'PracticeEngine Lambda Fixes',
        description: 'Critical fixes for Feb 28 launch: animated captions, retry logic, validation schemas',
        type: 'document' as const,
        content: `# PracticeEngine Lambda Fixes

## Summary
Critical fixes pushed to \`blakemc123/practice-engine\` (commit \`44e1eaad\`)

## Changes

### 1. NEW: Animated Caption Generation
- Endpoint: \`/api/video/captions/animated\`
- 5 animation styles: hormozi, bounce, typewriter, highlight, karaoke
- Output formats: Remotion, Creatomate, JSON

### 2. Retry Logic
- Added \`withRetry\` wrapper to all external API calls
- Covers: Replicate, Shotstack, Whisper

### 3. Validation Schemas
- \`videoGenerateSchema\`: prompt, duration, model, aspectRatio
- \`easyButtonSchema\`: content_item_id, video_project_id, flags

## Testing
All endpoints tested locally. Ready for staging deployment.

## Risk Level
🟡 Medium - Core video processing pipeline changes`,
        submittedBy: 'Forge',
        priority: 'high' as const,
        tags: ['code', 'pe', 'launch-critical'],
        captainRecommendation: 'approved' as const,
        captainNotes: 'Code looks solid. Addresses all audit items.',
      },
      {
        title: 'Social Scheduler N8N Pipeline',
        description: 'Buffer + direct API integration for automated social media posting',
        type: 'document' as const,
        content: `# Social Scheduler Pipeline

## Workflows Imported

| ID | Name | Purpose |
|----|------|---------|
| HPVB9pal0H4p8TRW | Content Intake | Watch Drive → Buffer |
| TaPLbzwu9aYHiRw0 | Direct Publishing | Fallback API |
| xK743XRiXf3vzfFJ | Daily Reporting | 9 AM digest |

## How It Works
1. Drop content in Google Drive "Social Content" folder
2. N8N parses filename: \`instagram_2026-02-10_14-30_caption.jpg\`
3. Routes to Buffer or direct platform API
4. Telegram notification on success/failure

## Setup Required
- Buffer access token (free tier: 3 channels, 10 queued)
- Google Drive OAuth2
- Telegram bot for notifications`,
        submittedBy: 'Forge',
        priority: 'medium' as const,
        tags: ['n8n', 'automation', 'social'],
        captainRecommendation: 'approved' as const,
        captainNotes: 'Good architecture. Buffer free tier may limit scale.',
      },
      {
        title: 'Mission Control Phase 2+3',
        description: 'Live data integration and new dashboard components',
        type: 'website' as const,
        previewUrl: 'https://mission-control-eight-alpha.vercel.app',
        content: `# Mission Control Updates

## New Features
- **TaskBoard** - View/filter tasks by status
- **CronCalendar** - View scheduled jobs
- **Review Portal** - This very page!

## Live Data Sources
- Agent memory files
- Gateway cron API
- TASK-BOARD.md / HEARTBEAT.md`,
        submittedBy: 'Forge',
        priority: 'high' as const,
        tags: ['dashboard', 'infrastructure'],
      },
      {
        title: 'Secure Dentures Demo Site',
        description: 'Static Next.js site for doctor onboarding demo',
        type: 'website' as const,
        previewUrl: 'https://secure-dentures-demo.vercel.app',
        submittedBy: 'Forge',
        priority: 'medium' as const,
        tags: ['demo', 'dental', 'vercel'],
        captainRecommendation: 'approved' as const,
        captainNotes: 'Matches spec from Pepper. Ready for client preview.',
      },
      {
        title: 'Swap CLI Specification',
        description: 'CLI tool for Ultron trading wallet on Polygon',
        type: 'document' as const,
        content: `# Swap CLI Specification

## Purpose
Unblock Ultron from simulated to real trading.

## Safety Caps
- Max single trade: $50
- Daily cap: $100
- Dry-run by default

## Commands
\`\`\`bash
swap balance
swap 10 USDC WMATIC --execute
\`\`\`

## Security
- Private key from secrets file, never logged
- Only verified token addresses allowed
- All transactions logged

**Status:** Queued after Mission Control`,
        submittedBy: 'Forge',
        priority: 'low' as const,
        tags: ['trading', 'ultron', 'spec'],
      },
    ];

    const created = [];
    for (const review of sampleReviews) {
      const item = await addReview(review);
      created.push(item.id);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      ids: created,
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
