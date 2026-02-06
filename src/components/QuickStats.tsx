'use client';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}

const stats: Stat[] = [
  {
    label: 'Tasks Completed',
    value: 12,
    change: '+3 today',
    trend: 'up',
    icon: '✅',
  },
  {
    label: 'Active Agents',
    value: 2,
    change: '5 total',
    trend: 'neutral',
    icon: '🤖',
  },
  {
    label: 'PRs Merged',
    value: 3,
    change: 'This week',
    trend: 'up',
    icon: '🔀',
  },
  {
    label: 'Deployments',
    value: 2,
    change: 'Today',
    trend: 'up',
    icon: '🚀',
  },
];

export function QuickStats() {
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
