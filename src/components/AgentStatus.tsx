'use client';

import { useState, useEffect, useCallback } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: 'active' | 'idle' | 'offline';
  lastActivity: string | null;
  memoryFiles: number;
  workspacePath: string;
}

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

// Role mappings based on agent ID
const AGENT_ROLES: Record<string, string> = {
  captain: 'Fleet Commander',
  main: 'Fleet Commander',
  forge: 'CTO / DevOps',
  devops: 'CTO / DevOps',
  friday: 'Research',
  research: 'Research',
  strange: 'Video Production',
  video: 'Video Production',
  pepper: 'Marketing / Funnels',
  'dental-marketing': 'Dental Marketing',
  ultron: 'Trading',
  trading: 'Trading',
};

export function AgentStatus() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents || []);
      setDataSource(data.source);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchAgents, 60000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const getRole = (agentId: string): string => {
    return AGENT_ROLES[agentId.toLowerCase()] || 'Agent';
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-lg">👥</span>
          Fleet Status
          {dataSource === 'filesystem' && (
            <span className="text-xs text-green-500 ml-auto">● Live</span>
          )}
        </h2>
      </div>

      {/* Agent List */}
      <div className="divide-y divide-gray-800">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No agents found
          </div>
        ) : (
          agents.map((agent) => (
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
                  <p className="text-gray-500 text-sm">{getRole(agent.id)}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {agent.memoryFiles > 0 && (
                      <span>📝 {agent.memoryFiles} memories</span>
                    )}
                    {agent.lastActivity && (
                      <span>📅 {agent.lastActivity}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
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
