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
              <span className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-500">● Live Data</span>
                <span className="text-xs text-gray-500">🔒 Read-Only</span>
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

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🔒</span>
            <span>
              This dashboard is read-only. Data sources: Agent memory files, gateway cron, on-chain wallet. 
              No agent control or input fields.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
