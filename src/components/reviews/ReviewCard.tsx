'use client';

import { useState } from 'react';
import { ReviewItem, ReviewStatus } from '@/lib/reviews';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReviewCardProps {
  review: ReviewItem;
  onDecision: (id: string, status: ReviewStatus, comment?: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const typeIcons: Record<string, string> = {
  document: '📄',
  copy: '✍️',
  image: '🖼️',
  website: '🌐',
  video: '🎬',
  code: '💻',
  other: '📦',
};

const priorityColors = {
  high: 'border-l-red-500 bg-red-500/5',
  medium: 'border-l-amber-500 bg-amber-500/5',
  low: 'border-l-green-500 bg-green-500/5',
};

const statusBadges = {
  pending: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  changes_requested: 'bg-amber-500/20 text-amber-400',
  archived: 'bg-gray-500/20 text-gray-400',
};

export function ReviewCard({ review, onDecision, expanded = false, onToggleExpand }: ReviewCardProps) {
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [localDecision, setLocalDecision] = useState<ReviewStatus | null>(null);

  const handleDecision = (status: ReviewStatus) => {
    if (status === 'changes_requested' || status === 'rejected') {
      setLocalDecision(status);
      setShowCommentBox(true);
    } else {
      onDecision(review.id, status);
      setLocalDecision(status);
    }
  };

  const submitWithComment = () => {
    if (localDecision) {
      onDecision(review.id, localDecision, comment);
      setShowCommentBox(false);
    }
  };

  const currentStatus = localDecision || review.status;

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden border-l-4 ${priorityColors[review.priority]}`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl shrink-0">
            {typeIcons[review.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white">{review.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadges[currentStatus]}`}>
                {currentStatus.replace('_', ' ')}
              </span>
              {review.captainRecommendation && (
                <span className="text-xs text-purple-400">
                  🎖️ Captain: {review.captainRecommendation}
                </span>
              )}
            </div>
            
            {review.description && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{review.description}</p>
            )}
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>👤 {review.submittedBy}</span>
              <span>⏰ {formatDistanceToNow(new Date(review.submittedAt), { addSuffix: true })}</span>
              {review.tags && review.tags.length > 0 && (
                <span>🏷️ {review.tags.join(', ')}</span>
              )}
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {review.previewUrl ? (
              <a
                href={review.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                🔗 Preview
              </a>
            ) : review.videoUrl ? (
              <a
                href={review.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                🎬 Watch
              </a>
            ) : review.contentUrl ? (
              <a
                href={review.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                📎 View
              </a>
            ) : (review.type === 'document' || review.type === 'copy') && review.content ? (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                📄 Read
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium inline-flex items-center gap-1">
                ⚠️ No Preview
              </span>
            )}
          </div>

          {/* Expand Arrow */}
          <span className="text-gray-500 text-xl shrink-0">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Content Preview */}
          <div className="p-4 bg-gray-950/50 max-h-[400px] overflow-y-auto">
            {review.type === 'document' || review.type === 'copy' ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {review.content || '*No content provided*'}
                </ReactMarkdown>
              </div>
            ) : review.type === 'image' && review.imageUrl ? (
              <img 
                src={review.imageUrl} 
                alt={review.title}
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            ) : review.type === 'website' && review.previewUrl ? (
              <div className="space-y-2">
                <a 
                  href={review.previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  🔗 Open Preview: {review.previewUrl}
                </a>
                <iframe 
                  src={review.previewUrl}
                  className="w-full h-[300px] rounded-lg border border-gray-700"
                  title={review.title}
                  onError={(e) => { (e.target as HTMLIFrameElement).style.display = 'none'; }}
                />
                <p className="text-xs text-gray-500">If the preview doesn't load above, use the direct link.</p>
              </div>
            ) : review.type === 'video' && review.videoUrl ? (
              <div className="space-y-2">
                <a 
                  href={review.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                >
                  🔗 Open Video: {review.videoUrl}
                </a>
                {review.videoUrl.includes('youtube') || review.videoUrl.includes('vimeo') ? (
                  <iframe 
                    src={review.videoUrl.replace('watch?v=', 'embed/')}
                    className="w-full aspect-video rounded-lg"
                    allowFullScreen
                    title={review.title}
                  />
                ) : (
                  <video 
                    src={review.videoUrl} 
                    controls 
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            ) : review.contentUrl ? (
              <a 
                href={review.contentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                🔗 View Content: {review.contentUrl}
              </a>
            ) : (
              <p className="text-gray-500 italic">No preview was provided with this submission. Ask the submitter to resubmit with a working preview URL.</p>
            )}
          </div>

          {/* Captain's Notes */}
          {review.captainNotes && (
            <div className="p-4 bg-purple-500/10 border-t border-gray-800">
              <p className="text-sm text-purple-300">
                <span className="font-medium">🎖️ Captain's Notes:</span> {review.captainNotes}
              </p>
            </div>
          )}

          {/* Comment Box */}
          {showCommentBox && (
            <div className="p-4 bg-gray-800/50 border-t border-gray-800">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add feedback or reason..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={submitWithComment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Submit Feedback
                </button>
                <button
                  onClick={() => setShowCommentBox(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {review.status === 'pending' && !showCommentBox && (
            <div className="p-4 border-t border-gray-800 flex gap-3 flex-wrap">
              <button
                onClick={() => handleDecision('approved')}
                className={`flex-1 min-w-[120px] py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  localDecision === 'approved' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
                }`}
              >
                ✅ Approve
              </button>
              <button
                onClick={() => handleDecision('changes_requested')}
                className={`flex-1 min-w-[120px] py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  localDecision === 'changes_requested' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40'
                }`}
              >
                🔄 Changes
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                className={`flex-1 min-w-[120px] py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  localDecision === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                }`}
              >
                ❌ Reject
              </button>
            </div>
          )}

          {/* Past Decision Display */}
          {review.decision && review.status !== 'pending' && (
            <div className="p-4 border-t border-gray-800 bg-gray-800/30">
              <p className="text-sm text-gray-400">
                <span className="font-medium">Decision:</span>{' '}
                <span className={statusBadges[review.status]}>{review.status.replace('_', ' ')}</span>
                {review.decision.comment && (
                  <span className="block mt-1 text-gray-300">"{review.decision.comment}"</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
