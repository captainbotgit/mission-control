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

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

interface TaskFormData {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
}

const AGENTS = ['Forge', 'Captain', 'Friday', 'Strange', 'Pepper', 'Ultron'];

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in-progress', 'done'];

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

const statusIcons: Record<TaskStatus, string> = {
  'todo': '⬜',
  'in-progress': '🔄',
  'done': '✅',
  'blocked': '🚫',
};

const emptyForm: TaskFormData = { title: '', status: 'todo', priority: 'medium', assignee: '' };

function TaskForm({ initial, onSave, onCancel }: {
  initial: TaskFormData;
  onSave: (data: TaskFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TaskFormData>(initial);

  return (
    <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg space-y-2">
      <input
        autoFocus
        placeholder="Task title..."
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 flex-wrap">
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todo">⬜ To Do</option>
          <option value="in-progress">🔄 In Progress</option>
          <option value="done">✅ Done</option>
          <option value="blocked">🚫 Blocked</option>
        </select>
        <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Unassigned</option>
          {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={() => form.title.trim() && onSave(form)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors disabled:opacity-50">
          Save
        </button>
      </div>
    </div>
  );
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dataSource, setDataSource] = useState<string>('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const createTask = async (form: TaskFormData) => {
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = { id: tempId, ...form, source: 'dashboard' };
    setTasks(prev => [newTask, ...prev]);
    setShowNewForm(false);
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Create failed');
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === tempId ? (data.task || { ...newTask, id: data.id || tempId }) : t));
    } catch {
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const updateTask = async (id: string, form: TaskFormData) => {
    const prev = tasks;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...form } : t));
    setEditingId(null);
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
      if (!res.ok) throw new Error('Update failed');
    } catch {
      setTasks(prev);
    }
  };

  const deleteTask = async (id: string) => {
    const prev = tasks;
    setTasks(ts => ts.filter(t => t.id !== id));
    try {
      const res = await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Delete failed');
    } catch {
      setTasks(prev);
    }
  };

  const cycleStatus = async (task: Task) => {
    const idx = STATUS_CYCLE.indexOf(task.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await updateTask(task.id, { title: task.title, priority: task.priority, status: nextStatus, assignee: task.assignee || '' });
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

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
          <button
            onClick={() => { setShowNewForm(f => !f); setEditingId(null); }}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>＋</span> New Task
          </button>
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

      {/* New Task Form */}
      {showNewForm && (
        <div className="p-4 border-b border-gray-800">
          <TaskForm initial={emptyForm} onSave={createTask} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

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
            <span className="text-lg">{statusIcons[status as TaskStatus]}</span>
            <p className="text-xs text-gray-400 mt-1 capitalize">{status.replace('-', ' ')}</p>
            <p className="text-lg font-bold">{count}</p>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No tasks found</div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id}>
              {editingId === task.id ? (
                <div className="p-4">
                  <TaskForm
                    initial={{ title: task.title, status: task.status, priority: task.priority, assignee: task.assignee || '' }}
                    onSave={(form) => updateTask(task.id, form)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  className={`group px-4 py-3 border-l-4 ${priorityColors[task.priority]} hover:bg-gray-800/30 transition-colors cursor-pointer relative`}
                  onClick={() => { setEditingId(task.id); setShowNewForm(false); }}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon - click to cycle */}
                    <button
                      className="text-lg mt-0.5 hover:scale-125 transition-transform"
                      onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
                      title="Click to cycle status"
                    >
                      {statusIcons[task.status]}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityBadges[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.assignee && (
                          <span className="text-xs text-gray-500">👤 {task.assignee}</span>
                        )}
                      </div>
                      <p className="text-gray-200 mt-1">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">📄 {task.source}</p>
                    </div>

                    {/* Delete button */}
                    <button
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-sm p-1"
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
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
