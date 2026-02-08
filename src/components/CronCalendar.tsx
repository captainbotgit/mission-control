'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: 'at' | 'every' | 'cron';
    expr?: string;
    at?: string;
    everyMs?: number;
  };
  sessionTarget: 'main' | 'isolated';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

function formatSchedule(schedule: CronJob['schedule']): string {
  switch (schedule.kind) {
    case 'cron':
      return schedule.expr || 'Custom cron';
    case 'every':
      if (!schedule.everyMs) return 'Interval';
      const mins = Math.round(schedule.everyMs / 60000);
      if (mins < 60) return `Every ${mins}m`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `Every ${hours}h`;
      return `Every ${Math.round(hours / 24)}d`;
    case 'at':
      return schedule.at ? format(parseISO(schedule.at), 'MMM d, HH:mm') : 'Scheduled';
    default:
      return 'Unknown';
  }
}

export function CronCalendar() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/cron');
      const data = await response.json();
      setJobs(data.jobs || []);
      setDataSource(data.source);
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Sort by next run time
  const sortedJobs = [...jobs].sort((a, b) => {
    if (!a.nextRun) return 1;
    if (!b.nextRun) return -1;
    return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime();
  });

  const upcomingJobs = sortedJobs.filter(j => j.nextRun && new Date(j.nextRun) > new Date());

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-lg">⏰</span>
          Scheduled Jobs
          {dataSource === 'gateway' && (
            <span className="text-xs text-green-500 ml-2">● Live</span>
          )}
        </h2>
        <span className="text-xs text-gray-500">
          {jobs.filter(j => j.enabled).length} active
        </span>
      </div>

      {/* Upcoming Section */}
      {upcomingJobs.length > 0 && (
        <div className="p-4 bg-blue-500/5 border-b border-gray-800">
          <h3 className="text-xs text-blue-400 font-medium mb-2">⏭️ NEXT UP</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              🔔
            </div>
            <div>
              <p className="font-medium">{upcomingJobs[0].name}</p>
              <p className="text-xs text-gray-400">
                {upcomingJobs[0].nextRun && formatDistanceToNow(parseISO(upcomingJobs[0].nextRun), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Loading scheduled jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No scheduled jobs
          </div>
        ) : (
          sortedJobs.map((job) => (
            <div 
              key={job.id} 
              className={`px-4 py-3 hover:bg-gray-800/50 transition-colors ${!job.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  job.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {job.schedule.kind === 'cron' ? '📅' : job.schedule.kind === 'every' ? '🔄' : '📌'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{job.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      job.sessionTarget === 'main' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.sessionTarget}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{formatSchedule(job.schedule)}</span>
                    {job.lastRun && (
                      <span>
                        Last: {formatDistanceToNow(parseISO(job.lastRun), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Next Run */}
                {job.nextRun && job.enabled && (
                  <div className="text-xs text-gray-400">
                    {format(parseISO(job.nextRun), 'HH:mm')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-xs text-gray-500 text-center">
          {jobs.length} jobs • Source: {dataSource || 'loading'}
        </p>
      </div>
    </div>
  );
}
