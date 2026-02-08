'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ReviewItem } from '@/lib/reviews';

const statusBadges = {
  pending: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  changes_requested: 'bg-amber-500/20 text-amber-400',
};

const statusIcons = {
  approved: '✅',
  rejected: '❌',
  changes_requested: '🔄',
  pending: '⏳',
};

export default function HistoryPage() {
  const [history, setHistory] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, changesRequested: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const url = search 
        ? `/api/reviews/history?search=${encodeURIComponent(search)}`
        : '/api/reviews/history';
      const response = await fetch(url);
      const data = await response.json();
      setHistory(data.history || []);
      setStats(data.stats || { total: 0, approved: 0, rejected: 0, changesRequested: 0 });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchHistory, 300);
    return () => clearTimeout(debounce);
  }, [fetchHistory]);

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/reviews"
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Reviews
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📜</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Review History</h1>
                  <p className="text-xs text-gray-400">Past decisions and feedback</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/30">
            <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
            <p className="text-xs text-green-500">Approved</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            <p className="text-xs text-red-500">Rejected</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30">
            <p className="text-2xl font-bold text-amber-400">{stats.changesRequested}</p>
            <p className="text-xs text-amber-500">Changes</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search history..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* History List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <span className="animate-spin inline-block text-2xl mb-2">⏳</span>
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-400">No history found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div 
                key={item.id}
                className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <span className="text-2xl">
                    {statusIcons[item.status]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{item.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadges[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {item.decision?.comment && (
                      <p className="text-gray-400 text-sm mt-1">
                        "{item.decision.comment}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>👤 {item.submittedBy}</span>
                      <span>
                        ⏰ Decided {item.decision?.decidedAt 
                          ? formatDistanceToNow(new Date(item.decision.decidedAt), { addSuffix: true })
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
