'use client';

import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  deadline?: string;
  source: string;
}

const priorityColors = {
  high: 'border-l-red-500 bg-red-500/5',
  medium: 'border-l-amber-500 bg-amber-500/5',
  low: 'border-l-green-500 bg-green-500/5',
};

const priorityBadges = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
};

const statusIcons = {
  'todo': '⬜',
  'in-progress': '🔄',
  'done': '✅',
  'blocked': '🚫',
};

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dataSource, setDataSource] = useState<string>('');

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setDataSource(data.source);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  const statusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-lg">📋</span>
          Task Board
          {dataSource === 'filesystem' && (
            <span className="text-xs text-green-500 ml-2">● Live</span>
          )}
        </h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All ({tasks.length})</option>
            <option value="todo">To Do ({statusCounts.todo})</option>
            <option value="in-progress">In Progress ({statusCounts['in-progress']})</option>
            <option value="done">Done ({statusCounts.done})</option>
            <option value="blocked">Blocked ({statusCounts.blocked})</option>
          </select>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-2 p-4 bg-gray-800/30">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`p-2 rounded-lg text-center transition-colors ${
              filter === status ? 'bg-gray-700 ring-2 ring-blue-500' : 'bg-gray-800/50 hover:bg-gray-800'
            }`}
          >
            <span className="text-lg">{statusIcons[status as keyof typeof statusIcons]}</span>
            <p className="text-xs text-gray-400 mt-1 capitalize">{status.replace('-', ' ')}</p>
            <p className="text-lg font-bold">{count}</p>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No tasks found
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className={`px-4 py-3 border-l-4 ${priorityColors[task.priority]} hover:bg-gray-800/30 transition-colors`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <span className="text-lg mt-0.5">
                  {statusIcons[task.status]}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${priorityBadges[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.assignee && (
                      <span className="text-xs text-gray-500">
                        👤 {task.assignee}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-200 mt-1">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📄 {task.source}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-xs text-gray-500 text-center">
          {filteredTasks.length} tasks • Source: {dataSource || 'loading'}
        </p>
      </div>
    </div>
  );
}
