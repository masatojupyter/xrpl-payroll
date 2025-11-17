'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { getWalletBalance, formatXRP, type WalletBalance as WalletBalanceType } from '@/lib/rlusd/wallet';

interface WalletBalanceProps {
  walletAddress: string;
  onBalanceUpdate?: (balance: WalletBalanceType) => void;
  className?: string;
}

export default function WalletBalance({ walletAddress, onBalanceUpdate, className = '' }: WalletBalanceProps) {
  const [balance, setBalance] = useState<WalletBalanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      setError(null);
      const balanceData = await getWalletBalance(walletAddress);
      if (balanceData) {
        setBalance(balanceData);
        onBalanceUpdate?.(balanceData);
      } else {
        setError('Failed to fetch wallet balance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
  };

  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gray-200"></div>
            <div className="h-5 w-24 rounded bg-gray-200"></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1 h-4 w-16 rounded bg-gray-200"></div>
              <div className="h-8 w-32 rounded bg-gray-200"></div>
            </div>
            <div>
              <div className="mb-1 h-4 w-16 rounded bg-gray-200"></div>
              <div className="h-8 w-32 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <Wallet className="h-5 w-5" />
          <h3 className="font-semibold">Wallet Balance</h3>
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 text-sm font-medium text-red-700 hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
        <div className="flex items-center gap-2 text-gray-800">
          <Wallet className="h-5 w-5" />
          <h3 className="font-semibold">Wallet Balance</h3>
        </div>
        <p className="mt-2 text-sm text-gray-600">No balance data available</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <Wallet className="h-5 w-5" />
          <h3 className="font-semibold">Wallet Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {/* XRP Balance */}
        <div>
          <div className="text-sm text-gray-600">XRP Balance</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatXRP(balance.rlusd)}
            </span>
            <span className="text-lg text-gray-600">XRP</span>
          </div>
        </div>

        {/* XRP Balance */}
        <div className="border-t pt-4">
          <div className="text-sm text-gray-600">XRP Balance</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">
              {parseFloat(balance.xrp).toFixed(6)}
            </span>
            <span className="text-base text-gray-600">XRP</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Network fees are paid in XRP
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 border-t pt-4">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(balance.lastUpdated).toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  );
}
