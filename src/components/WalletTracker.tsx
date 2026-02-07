"use client";

import { useEffect, useState } from "react";

interface TokenBalance {
  symbol: string;
  balance: number;
  usdValue: number;
}

interface WalletData {
  totalValue: number;
  tokens: TokenBalance[];
  pnl: number;
  pnlPercent: number;
  lastUpdated: Date;
}

const WALLET_ADDRESS = "0x82f403A72d3c1710AD1e5448195FeD0BD0A87C34";
const BASELINE_VALUE = 201.77;

// Token contracts on Polygon
const TOKENS = {
  USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "USDC.e": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
};

export function WalletTracker() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ time: Date; value: number }[]>([]);

  const fetchWalletData = async () => {
    try {
      setError(null);
      
      // Call our API route to fetch wallet data
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        throw new Error("Failed to fetch wallet data");
      }
      
      const data = await response.json();
      
      const newData: WalletData = {
        totalValue: data.totalValue,
        tokens: data.tokens,
        pnl: data.totalValue - BASELINE_VALUE,
        pnlPercent: ((data.totalValue - BASELINE_VALUE) / BASELINE_VALUE) * 100,
        lastUpdated: new Date(),
      };
      
      setWalletData(newData);
      setHistory(prev => [...prev.slice(-11), { time: new Date(), value: newData.totalValue }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    // Poll every 5 minutes
    const interval = setInterval(fetchWalletData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💰</span> Ultron Wallet
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/2" />
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💰</span> Ultron Wallet
        </h2>
        <div className="text-red-400 text-sm">{error}</div>
        <button 
          onClick={fetchWalletData}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!walletData) return null;

  const isPositive = walletData.pnl >= 0;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>💰</span> Ultron Wallet
        </h2>
        <span className="text-xs text-gray-500">READ-ONLY</span>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <div className="text-3xl font-bold">
          {formatUSD(walletData.totalValue)}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span className="text-sm font-medium">
            {formatUSD(Math.abs(walletData.pnl))} ({isPositive ? '+' : ''}{walletData.pnlPercent.toFixed(2)}%)
          </span>
          <span className="text-xs text-gray-500">vs ${BASELINE_VALUE}</span>
        </div>
      </div>

      {/* Mini Chart */}
      {history.length > 1 && (
        <div className="mb-6 h-16 flex items-end gap-1">
          {history.map((point, i) => {
            const min = Math.min(...history.map(h => h.value));
            const max = Math.max(...history.map(h => h.value));
            const range = max - min || 1;
            const height = ((point.value - min) / range) * 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${point.value >= BASELINE_VALUE ? 'bg-green-500/50' : 'bg-red-500/50'}`}
                style={{ height: `${Math.max(height, 10)}%` }}
                title={`${formatUSD(point.value)} @ ${point.time.toLocaleTimeString()}`}
              />
            );
          })}
        </div>
      )}

      {/* Token Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">Holdings</h3>
        {walletData.tokens.map((token) => (
          <div key={token.symbol} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-xs">
                {token.symbol === 'MATIC' ? '🟣' : '💵'}
              </div>
              <span>{token.symbol}</span>
            </div>
            <div className="text-right">
              <div className="text-white">{formatUSD(token.usdValue)}</div>
              <div className="text-xs text-gray-500">{token.balance.toFixed(4)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <a 
          href={`https://polygonscan.com/address/${WALLET_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400 transition-colors"
        >
          View on PolygonScan ↗
        </a>
        <span>
          Updated {walletData.lastUpdated.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
