'use client';

import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getTransactionHistory, formatXRP, formatAddress, type Transaction } from '@/lib/rlusd/wallet';

interface TransactionHistoryProps {
  walletAddress: string;
  limit?: number;
  className?: string;
}

export default function TransactionHistory({ walletAddress, limit = 50, className = '' }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const history = await getTransactionHistory(walletAddress, limit);
      setTransactions(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Transaction History</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200"></div>
                  <div className="h-3 w-48 rounded bg-gray-200"></div>
                </div>
                <div className="h-5 w-24 rounded bg-gray-200"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
        <h3 className="font-semibold text-red-800">Transaction History</h3>
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

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Transaction History</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          title="Refresh transactions"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-600">No transactions yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Your transaction history will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Transaction Type Icon */}
                <div
                  className={`mt-1 rounded-full p-2 ${
                    tx.type === 'send'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {tx.type === 'send' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {tx.type === 'send' ? 'Sent' : 'Received'}{' '}
                        {tx.currency}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 truncate">
                        {tx.type === 'send' ? 'To: ' : 'From: '}
                        <code className="text-xs">
                          {formatAddress(tx.type === 'send' ? tx.to : tx.from)}
                        </code>
                      </div>
                      {tx.description && (
                        <div className="mt-1 text-xs text-gray-500">
                          {tx.description}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {new Date(tx.timestamp).toLocaleString('ja-JP')}
                        </span>
                        {tx.transactionHash && (
                          <>
                            <span>•</span>
                            <code className="text-xs">
                              {formatAddress(tx.transactionHash, 4)}
                            </code>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${
                          tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {tx.type === 'send' ? '-' : '+'}
                        {formatXRP(tx.amount)}
                      </div>
                      <div className="text-xs text-gray-500">{tx.currency}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-2 flex items-center gap-1">
                    {getStatusIcon(tx.status)}
                    <span className={`text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
