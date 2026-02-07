import { ActivityFeed } from "@/components/ActivityFeed";
import { AgentStatus } from "@/components/AgentStatus";
import { QuickStats } from "@/components/QuickStats";
import { WalletTracker } from "@/components/WalletTracker";

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
                <span className="text-xs text-gray-500">🔒 Secured</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <QuickStats />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Activity Feed - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>

          {/* Right Column - Agent Status + Wallet Tracker */}
          <div className="lg:col-span-1 space-y-6">
            <WalletTracker />
            <AgentStatus />
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🔒</span>
            <span>
              This dashboard is read-only. No agent control or input fields. 
              Wallet data is fetched from public on-chain sources only.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
