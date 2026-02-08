import Link from 'next/link';
import { ReviewQueue } from '@/components/reviews/ReviewQueue';

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Review Portal</h1>
                  <p className="text-xs text-gray-400">Approve, reject, or request changes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/reviews/history"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                📜 History
              </Link>
              <span className="text-xs text-gray-500">🔒 Secured</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <ReviewQueue />
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 py-3 px-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between text-xs text-gray-500">
          <span>Tap item to expand • Big buttons for mobile</span>
          <span>Mission Control v2</span>
        </div>
      </footer>
    </main>
  );
}
