'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: 'active' | 'idle' | 'offline';
  currentTask?: string;
  lastSeen: Date;
}

const mockAgents: Agent[] = [
  {
    id: 'captain',
    name: 'Captain',
    emoji: '🎖️',
    role: 'Fleet Commander',
    status: 'active',
    currentTask: 'Coordinating fleet operations',
    lastSeen: new Date(),
  },
  {
    id: 'forge',
    name: 'Forge',
    emoji: '⚙️',
    role: 'CTO / DevOps',
    status: 'active',
    currentTask: 'Building Mission Control MVP',
    lastSeen: new Date(),
  },
  {
    id: 'friday',
    name: 'Friday',
    emoji: '📚',
    role: 'Research',
    status: 'idle',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 'strange',
    name: 'Strange',
    emoji: '🎬',
    role: 'Video Production',
    status: 'idle',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
  },
  {
    id: 'pepper',
    name: 'Pepper',
    emoji: '💼',
    role: 'Marketing / Funnels',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];

const statusColors = {
  active: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-gray-500',
};

const statusLabels = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
};

export function AgentStatus() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    setAgents(mockAgents);
  }, []);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-lg">👥</span>
          Fleet Status
        </h2>
      </div>

      {/* Agent List */}
      <div className="divide-y divide-gray-800">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Avatar with status indicator */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                  {agent.emoji}
                </div>
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${statusColors[agent.status]}`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    agent.status === 'idle' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {statusLabels[agent.status]}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{agent.role}</p>
                {agent.currentTask && (
                  <p className="text-gray-400 text-xs mt-1 truncate">
                    📌 {agent.currentTask}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{agents.filter(a => a.status === 'active').length} active</span>
          <span>{agents.length} total agents</span>
        </div>
      </div>
    </div>
  );
}
