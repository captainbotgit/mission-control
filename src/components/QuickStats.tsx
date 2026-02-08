'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}

export function QuickStats() {
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Tasks Completed', value: '...', icon: '✅' },
    { label: 'Active Agents', value: '...', icon: '🤖' },
    { label: 'Activities Today', value: '...', icon: '📊' },
    { label: 'Scheduled Jobs', value: '...', icon: '⏰' },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [agentsRes, tasksRes, activityRes, cronRes] = await Promise.all([
        fetch('/api/agents').catch(() => null),
        fetch('/api/tasks').catch(() => null),
        fetch('/api/activity?limit=100').catch(() => null),
        fetch('/api/cron').catch(() => null),
      ]);

      const agents = agentsRes ? await agentsRes.json() : { agents: [] };
      const tasks = tasksRes ? await tasksRes.json() : { tasks: [] };
      const activity = activityRes ? await activityRes.json() : { activities: [] };
      const cron = cronRes ? await cronRes.json() : { jobs: [] };

      // Calculate stats
      const activeAgents = agents.agents?.filter((a: any) => a.status === 'active').length || 0;
      const totalAgents = agents.agents?.length || 0;

      const completedTasks = tasks.tasks?.filter((t: any) => t.status === 'done').length || 0;
      const totalTasks = tasks.tasks?.length || 0;

      const today = new Date().toDateString();
      const todayActivities = activity.activities?.filter((a: any) => 
        new Date(a.timestamp).toDateString() === today
      ).length || 0;

      const activeJobs = cron.jobs?.filter((j: any) => j.enabled).length || 0;
      const totalJobs = cron.jobs?.length || 0;

      setStats([
        {
          label: 'Tasks Done',
          value: completedTasks,
          change: `${totalTasks} total`,
          trend: completedTasks > 0 ? 'up' : 'neutral',
          icon: '✅',
        },
        {
          label: 'Active Agents',
          value: activeAgents,
          change: `${totalAgents} total`,
          trend: activeAgents > 0 ? 'up' : 'neutral',
          icon: '🤖',
        },
        {
          label: 'Activities Today',
          value: todayActivities,
          change: `${activity.activities?.length || 0} this week`,
          trend: todayActivities > 5 ? 'up' : todayActivities > 0 ? 'neutral' : 'down',
          icon: '📊',
        },
        {
          label: 'Scheduled Jobs',
          value: activeJobs,
          change: `${totalJobs} total`,
          trend: 'neutral',
          icon: '⏰',
        },
      ]);

    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{stat.icon}</span>
            {stat.trend && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '•'}
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
          </div>
          {stat.change && (
            <p className="text-xs text-gray-400 mt-2">{stat.change}</p>
          )}
        </div>
      ))}
    </div>
  );
}
