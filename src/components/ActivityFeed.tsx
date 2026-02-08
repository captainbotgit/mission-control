'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'task' | 'commit' | 'message' | 'alert' | 'deploy';
}

const typeColors = {
  task: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  commit: 'bg-green-500/20 text-green-400 border-green-500/30',
  message: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  alert: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  deploy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const typeIcons = {
  task: '✓',
  commit: '📝',
  message: '💬',
  alert: '⚠️',
  deploy: '🚀',
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch('/api/activity?limit=30');
      const data = await response.json();
      
      // Convert timestamp strings to Date objects
      const parsed = data.activities.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
      
      setActivities(parsed);
      setDataSource(data.source);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.agent.toLowerCase() === filter.toLowerCase());

  const agents = [...new Set(activities.map(a => a.agent))];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-lg">📋</span>
          Activity Feed
        </h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent} value={agent.toLowerCase()}>{agent}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
        {filteredActivities.map((activity) => (
          <div 
            key={activity.id} 
            className="px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Agent Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl shrink-0">
                {activity.agentEmoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{activity.agent}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[activity.type]}`}>
                    {typeIcons[activity.type]} {activity.type}
                  </span>
                </div>
                <p className="text-gray-300 mt-0.5">{activity.action}</p>
                <p className="text-gray-500 text-sm mt-1 truncate">{activity.details}</p>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 shrink-0">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-xs text-gray-500 text-center">
          Showing {filteredActivities.length} activities • Auto-refreshes every 30s
          {dataSource && <span className="ml-2">• Source: {dataSource}</span>}
        </p>
      </div>
    </div>
  );
}
