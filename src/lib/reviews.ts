import { promises as fs } from 'fs';
import path from 'path';

// Review Portal Data Layer
// Supports both file-based (local) and Supabase (production) storage

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ReviewType = 'document' | 'copy' | 'image' | 'website' | 'video' | 'code' | 'other';

export interface ReviewItem {
  id: string;
  title: string;
  description?: string;
  type: ReviewType;
  
  // Content - one of these based on type
  content?: string;
  contentUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  filePath?: string;
  
  // Metadata
  submittedBy: string;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
  
  // Captain's pre-review
  captainRecommendation?: ReviewStatus;
  captainNotes?: string;
  
  // Blake's decision
  status: ReviewStatus;
  decision?: {
    status: ReviewStatus;
    comment?: string;
    decidedAt: string;
  };
  
  // History
  history?: {
    status: ReviewStatus;
    comment?: string;
    decidedBy: string;
    decidedAt: string;
  }[];
}

export interface ReviewStore {
  reviews: ReviewItem[];
  lastUpdated: string;
  version: number;
}

// In-memory cache for Vercel (reset on cold start)
let memoryStore: ReviewStore = {
  reviews: [],
  lastUpdated: new Date().toISOString(),
  version: 1,
};

// File-based storage paths (for local dev)
const REVIEWS_DIR = process.env.REVIEWS_DIR || path.join(process.env.HOME || '/tmp', '.openclaw', 'reviews');
const REVIEWS_FILE = path.join(REVIEWS_DIR, 'reviews.json');

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1';

// Supabase config (optional)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureDir() {
  if (IS_VERCEL) return;
  try {
    await fs.mkdir(REVIEWS_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

// Read reviews - uses Supabase if configured, else file, else memory
export async function getReviews(): Promise<ReviewStore> {
  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&order=submitted_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return {
          reviews: data.map(mapSupabaseToReview),
          lastUpdated: new Date().toISOString(),
          version: 1,
        };
      }
    } catch (e) {
      console.error('[Reviews] Supabase fetch failed:', e);
    }
  }

  // Try file storage
  if (!IS_VERCEL) {
    try {
      const content = await fs.readFile(REVIEWS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      // File doesn't exist
    }
  }

  // Fall back to memory
  return memoryStore;
}

// Save reviews
async function saveReviews(store: ReviewStore): Promise<void> {
  store.lastUpdated = new Date().toISOString();
  memoryStore = store;

  if (!IS_VERCEL) {
    await ensureDir();
    await fs.writeFile(REVIEWS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  }
}

// Get pending reviews
export async function getPendingReviews(): Promise<ReviewItem[]> {
  const store = await getReviews();
  return store.reviews.filter(r => r.status === 'pending');
}

// Get review by ID
export async function getReviewById(id: string): Promise<ReviewItem | null> {
  const store = await getReviews();
  return store.reviews.find(r => r.id === id) || null;
}

// Add a new review
export async function addReview(review: Omit<ReviewItem, 'id' | 'submittedAt' | 'status'>): Promise<ReviewItem> {
  const newReview: ReviewItem = {
    ...review,
    id: generateId(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };

  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(mapReviewToSupabase(newReview)),
      });
      if (response.ok) {
        const [data] = await response.json();
        return mapSupabaseToReview(data);
      }
    } catch (e) {
      console.error('[Reviews] Supabase insert failed:', e);
    }
  }

  // Fall back to local/memory
  const store = await getReviews();
  store.reviews.unshift(newReview);
  await saveReviews(store);
  
  return newReview;
}

// Update review decision
export async function updateReviewDecision(
  id: string, 
  status: ReviewStatus, 
  comment?: string
): Promise<ReviewItem | null> {
  const decision = {
    status,
    comment,
    decidedAt: new Date().toISOString(),
  };

  // Try Supabase first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      // First get current review to preserve history
      const getResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      
      if (!getResponse.ok) {
        console.error('[Reviews] Failed to fetch review for update');
        return null;
      }
      
      const [existingData] = await getResponse.json();
      if (!existingData) return null;
      
      // Build history
      const history = existingData.history || [];
      if (existingData.decision) {
        history.push({
          ...existingData.decision,
          decidedBy: 'blake',
        });
      }
      
      // Update in Supabase
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            status,
            decision,
            history,
          }),
        }
      );
      
      if (updateResponse.ok) {
        const [updatedData] = await updateResponse.json();
        console.log(`[Reviews] Updated ${id} to ${status} in Supabase`);
        return mapSupabaseToReview(updatedData);
      } else {
        const errorText = await updateResponse.text();
        console.error('[Reviews] Supabase update failed:', errorText);
      }
    } catch (e) {
      console.error('[Reviews] Supabase update error:', e);
    }
  }

  // Fall back to local/memory
  const store = await getReviews();
  const review = store.reviews.find(r => r.id === id);
  
  if (!review) return null;
  
  // Add to history
  if (!review.history) review.history = [];
  if (review.decision) {
    review.history.push({
      ...review.decision,
      decidedBy: 'blake',
    });
  }
  
  // Set new decision
  review.status = status;
  review.decision = decision;
  
  await saveReviews(store);
  return review;
}

// Batch update reviews
export async function batchUpdateReviews(
  decisions: { id: string; status: ReviewStatus; comment?: string }[]
): Promise<ReviewItem[]> {
  const store = await getReviews();
  const updated: ReviewItem[] = [];
  
  for (const decision of decisions) {
    const review = store.reviews.find(r => r.id === decision.id);
    if (!review) continue;
    
    if (!review.history) review.history = [];
    if (review.decision) {
      review.history.push({
        ...review.decision,
        decidedBy: 'blake',
      });
    }
    
    review.status = decision.status;
    review.decision = {
      status: decision.status,
      comment: decision.comment,
      decidedAt: new Date().toISOString(),
    };
    
    updated.push(review);
  }
  
  await saveReviews(store);
  return updated;
}

// Get review history
export async function getReviewHistory(limit = 50): Promise<ReviewItem[]> {
  const store = await getReviews();
  return store.reviews
    .filter(r => r.status !== 'pending')
    .sort((a, b) => {
      const aDate = a.decision?.decidedAt || a.submittedAt;
      const bDate = b.decision?.decidedAt || b.submittedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, limit);
}

// Generate unique ID
function generateId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Supabase mapping helpers
function mapReviewToSupabase(review: ReviewItem): any {
  return {
    id: review.id,
    title: review.title,
    description: review.description,
    type: review.type,
    content: review.content,
    content_url: review.contentUrl,
    image_url: review.imageUrl,
    video_url: review.videoUrl,
    preview_url: review.previewUrl,
    file_path: review.filePath,
    submitted_by: review.submittedBy,
    submitted_at: review.submittedAt,
    priority: review.priority,
    tags: review.tags,
    captain_recommendation: review.captainRecommendation,
    captain_notes: review.captainNotes,
    status: review.status,
    decision: review.decision,
    history: review.history,
  };
}

function mapSupabaseToReview(data: any): ReviewItem {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    type: data.type,
    content: data.content,
    contentUrl: data.content_url,
    imageUrl: data.image_url,
    videoUrl: data.video_url,
    previewUrl: data.preview_url,
    filePath: data.file_path,
    submittedBy: data.submitted_by,
    submittedAt: data.submitted_at,
    priority: data.priority,
    tags: data.tags,
    captainRecommendation: data.captain_recommendation,
    captainNotes: data.captain_notes,
    status: data.status,
    decision: data.decision,
    history: data.history,
  };
}

// Notification file for Captain (local only)
const NOTIFICATION_FILE = path.join(REVIEWS_DIR, 'pending-notification.json');

export async function writeNotification(message: string, decisions: ReviewItem[]): Promise<void> {
  if (IS_VERCEL) return; // Skip on Vercel
  
  await ensureDir();
  const notification = {
    message,
    decisions: decisions.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
      comment: d.decision?.comment,
    })),
    timestamp: new Date().toISOString(),
  };
  await fs.writeFile(NOTIFICATION_FILE, JSON.stringify(notification, null, 2), 'utf-8');
}

export async function readNotification(): Promise<any> {
  if (IS_VERCEL) return null;
  
  try {
    const content = await fs.readFile(NOTIFICATION_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function clearNotification(): Promise<void> {
  if (IS_VERCEL) return;
  
  try {
    await fs.unlink(NOTIFICATION_FILE);
  } catch {
    // File doesn't exist
  }
}

// Seed sample reviews (for demo)
export async function seedSampleReviews(): Promise<ReviewItem[]> {
  const sampleReviews = [
    {
      title: 'PracticeEngine Lambda Fixes',
      description: 'Critical fixes for Feb 28 launch: animated captions, retry logic, validation schemas',
      type: 'document' as ReviewType,
      content: `# PracticeEngine Lambda Fixes\n\n## Summary\nCritical fixes pushed to \`blakemc123/practice-engine\`\n\n## Changes\n- Animated caption generation\n- Retry logic for all APIs\n- Zod validation schemas`,
      submittedBy: 'Forge',
      priority: 'high' as const,
      tags: ['code', 'pe', 'launch-critical'],
      captainRecommendation: 'approved' as ReviewStatus,
      captainNotes: 'Code looks solid. Addresses all audit items.',
    },
    {
      title: 'Social Scheduler N8N Pipeline',
      description: 'Buffer + direct API integration for automated social posting',
      type: 'document' as ReviewType,
      content: `# Social Scheduler\n\n3 workflows imported to N8N:\n- Content Intake\n- Direct Publishing\n- Daily Reporting`,
      submittedBy: 'Forge',
      priority: 'medium' as const,
      tags: ['n8n', 'automation'],
      captainRecommendation: 'approved' as ReviewStatus,
    },
    {
      title: 'Mission Control Updates',
      description: 'Live data integration and Review Portal',
      type: 'website' as ReviewType,
      previewUrl: 'https://mission-control-eight-alpha.vercel.app',
      submittedBy: 'Forge',
      priority: 'high' as const,
      tags: ['dashboard'],
    },
    {
      title: 'Secure Dentures Demo',
      description: 'Static site for doctor onboarding',
      type: 'website' as ReviewType,
      previewUrl: 'https://secure-dentures-demo.vercel.app',
      submittedBy: 'Forge',
      priority: 'medium' as const,
      tags: ['demo', 'dental'],
    },
  ];

  const created: ReviewItem[] = [];
  for (const review of sampleReviews) {
    const item = await addReview(review);
    created.push(item);
  }
  return created;
}
