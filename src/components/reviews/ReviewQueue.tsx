'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReviewCard } from './ReviewCard';
import { ReviewItem, ReviewStatus } from '@/lib/reviews';

interface PendingDecision {
  id: string;
  status: ReviewStatus;
  comment?: string;
}

export function ReviewQueue() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState<Map<string, PendingDecision>>(new Map());
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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

  const handleDecision = (id: string, status: ReviewStatus, comment?: string) => {
    setPendingDecisions(prev => {
      const next = new Map(prev);
      next.set(id, { id, status, comment });
      return next;
    });
  };

  const handleSubmitAll = async () => {
    if (pendingDecisions.size === 0) {
      setSubmitMessage('No decisions to submit');
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const decisions = Array.from(pendingDecisions.values());
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitMessage(`✅ Submitted ${data.updated} decisions`);
        setPendingDecisions(new Map());
        fetchReviews(); // Refresh list
      } else {
        setSubmitMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setSubmitMessage('❌ Failed to submit decisions');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 5000);
    }
  };

  const pendingCount = reviews.length;
  const decidedCount = pendingDecisions.size;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{pendingCount}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{decidedCount}</p>
            <p className="text-xs text-gray-500">Decided</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitAll}
          disabled={submitting || decidedCount === 0}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            decidedCount > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Submitting...
            </>
          ) : (
            <>
              📤 Submit All ({decidedCount})
            </>
          )}
        </button>
      </div>

      {/* Submit Message */}
      {submitMessage && (
        <div className={`p-4 rounded-lg text-center ${
          submitMessage.startsWith('✅') ? 'bg-green-500/20 text-green-400' :
          submitMessage.startsWith('❌') ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {submitMessage}
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
            <ReviewCard
              key={review.id}
              review={{
                ...review,
                status: pendingDecisions.get(review.id)?.status || review.status,
              }}
              onDecision={handleDecision}
              expanded={expandedId === review.id}
              onToggleExpand={() => setExpandedId(expandedId === review.id ? null : review.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
