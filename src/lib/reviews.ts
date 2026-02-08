import { promises as fs } from 'fs';
import path from 'path';

/**
 * Review Portal Data Layer
 * 
 * Stores reviews in a JSON file for speed.
 * Can be migrated to Supabase later.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ReviewType = 'document' | 'copy' | 'image' | 'website' | 'video' | 'code' | 'other';

export interface ReviewItem {
  id: string;
  title: string;
  description?: string;
  type: ReviewType;
  
  // Content - one of these based on type
  content?: string;           // For document/copy - markdown or text
  contentUrl?: string;        // For remote content
  imageUrl?: string;          // For image type
  videoUrl?: string;          // For video type
  previewUrl?: string;        // For website - Vercel preview URL
  filePath?: string;          // For local file reference
  
  // Metadata
  submittedBy: string;        // Agent name
  submittedAt: string;        // ISO timestamp
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

const REVIEWS_DIR = process.env.REVIEWS_DIR || path.join(process.env.HOME || '', '.openclaw', 'reviews');
const REVIEWS_FILE = path.join(REVIEWS_DIR, 'reviews.json');

// Ensure directory exists
async function ensureDir() {
  try {
    await fs.mkdir(REVIEWS_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

// Read reviews from file
export async function getReviews(): Promise<ReviewStore> {
  await ensureDir();
  
  try {
    const content = await fs.readFile(REVIEWS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    // File doesn't exist, return empty store
    return {
      reviews: [],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };
  }
}

// Write reviews to file
export async function saveReviews(store: ReviewStore): Promise<void> {
  await ensureDir();
  store.lastUpdated = new Date().toISOString();
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(store, null, 2), 'utf-8');
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
  const store = await getReviews();
  
  const newReview: ReviewItem = {
    ...review,
    id: generateId(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
  
  store.reviews.unshift(newReview); // Add to front
  await saveReviews(store);
  
  return newReview;
}

// Update review decision
export async function updateReviewDecision(
  id: string, 
  status: ReviewStatus, 
  comment?: string
): Promise<ReviewItem | null> {
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
  review.decision = {
    status,
    comment,
    decidedAt: new Date().toISOString(),
  };
  
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
    
    // Add to history
    if (!review.history) review.history = [];
    if (review.decision) {
      review.history.push({
        ...review.decision,
        decidedBy: 'blake',
      });
    }
    
    // Set new decision
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

// Get review history (decided items)
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

// Notification file for Captain
const NOTIFICATION_FILE = path.join(REVIEWS_DIR, 'pending-notification.json');

export async function writeNotification(message: string, decisions: ReviewItem[]): Promise<void> {
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
  try {
    const content = await fs.readFile(NOTIFICATION_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function clearNotification(): Promise<void> {
  try {
    await fs.unlink(NOTIFICATION_FILE);
  } catch {
    // File doesn't exist
  }
}
