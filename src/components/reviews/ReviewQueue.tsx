'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReviewCard } from './ReviewCard';
import { ReviewItem, ReviewStatus } from '@/lib/reviews';

export function ReviewQueue() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch('/api/reviews?pending=true');
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // IMMEDIATE PERSIST: Each decision saves to Supabase right away
  const handleDecision = async (id: string, status: ReviewStatus, comment?: string) => {
    // Mark as saving
    setSavingIds(prev => new Set(prev).add(id));
    
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state to reflect the change
        setReviews(prev => prev.map(r => 
          r.id === id 
            ? { ...r, status, decision: { status, comment, decidedAt: new Date().toISOString() } }
            : r
        ));
        
        setMessage({ type: 'success', text: `✅ ${status.replace('_', ' ')} — saved!` });
        
        // Remove from list after short delay (so user sees the status change)
        setTimeout(() => {
          setReviews(prev => prev.filter(r => r.id !== id));
        }, 1500);
      } else {
        setMessage({ type: 'error', text: `❌ Failed to save: ${data.error}` });
      }
    } catch (error) {
      console.error('Failed to save decision:', error);
      setMessage({ type: 'error', text: '❌ Network error — decision not saved!' });
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const pendingCount = reviews.length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{pendingCount}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          ⚡ Decisions save immediately
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg text-center font-medium ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Review List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <span className="animate-spin inline-block text-2xl mb-2">⏳</span>
          <p>Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-xl font-medium text-gray-300">All caught up!</p>
          <p className="text-gray-500 mt-2">No pending reviews</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="relative">
              {savingIds.has(review.id) && (
                <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center z-10">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span className="ml-2 text-gray-300">Saving...</span>
                </div>
              )}
              <ReviewCard
                review={review}
                onDecision={handleDecision}
                expanded={expandedId === review.id}
                onToggleExpand={() => setExpandedId(expandedId === review.id ? null : review.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
