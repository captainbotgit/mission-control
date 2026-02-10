import { ActivityFeed } from "@/components/ActivityFeed";
import { AgentStatus } from "@/components/AgentStatus";
import { QuickStats } from "@/components/QuickStats";
import { WalletTracker } from "@/components/WalletTracker";
import { TaskBoard } from "@/components/TaskBoard";
import { CronCalendar } from "@/components/CronCalendar";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Mission Control</h1>
                <p className="text-xs text-gray-400">Fleet Operations Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="/reviews"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                📋 Review Portal
              </a>
              <span className="text-sm text-gray-400 hidden md:block">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-500">● Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <QuickStats />

        {/* Main Grid - 3 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left Column - Activity Feed (5 cols) */}
          <div className="lg:col-span-5">
            <ActivityFeed />
          </div>

          {/* Middle Column - Tasks (4 cols) */}
          <div className="lg:col-span-4">
            <TaskBoard />
          </div>

          {/* Right Column - Status + Wallet + Cron (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <AgentStatus />
            <WalletTracker />
            <CronCalendar />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🚀</span>
            <span>Dashboard with task management. Data sources: Agent memory files, gateway cron, on-chain wallet.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
