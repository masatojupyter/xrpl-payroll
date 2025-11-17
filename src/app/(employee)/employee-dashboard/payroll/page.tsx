'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Wallet,
  TrendingUp,
  Settings
} from 'lucide-react';
import Link from 'next/link';

// Types
type ApprovedAttendance = {
  id: string;
  date: string;
  totalWorkMinutes: number;
  totalWorkHours: string;
  hourlyRate: string;
  amountUSD: string;
  estimatedXRP: string;
  currentExchangeRate: string;
  payrollStatus: 'unpaid' | 'processing' | 'paid' | 'failed';
  payrollId: string | null;
  transactionHash: string | null;
  paidAt: string | null;
  hasWalletAddress: boolean;
};

type ApprovedAttendanceResponse = {
  success: boolean;
  data: ApprovedAttendance[];
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    hourlyRate: string;
    walletAddress: string | null;
    hasWalletAddress: boolean;
  };
  exchangeRate: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EmployeePayrollPage() {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch approved attendance data
  const { data: attendanceData, error: attendanceError, isLoading, mutate } = useSWR<ApprovedAttendanceResponse>(
    '/api/employee/approved-attendance',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatXRP = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toFixed(6)} XRP`;
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      unpaid: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="w-3 h-3" />,
        label: 'Unclaimed',
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        label: 'Processing',
      },
      paid: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Received',
      },
      failed: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="w-3 h-3" />,
        label: 'Failed',
      },
    };
    
    const config = configs[status as keyof typeof configs] || configs.unpaid;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const handleClaimPayment = async (attendanceId: string) => {
    try {
      setClaimingId(attendanceId);
      setError(null);

      const response = await fetch('/api/employee/claim-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceRecordId: attendanceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to claim payment');
      }

      // Refresh data
      await mutate();
      
      // Show success message
      alert(`Payment successful!\nAmount: ${result.payroll.amountXRP} XRP\nTransaction Hash: ${result.payroll.transactionHash}`);
    } catch (err) {
      console.error('Error claiming payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim payment');
    } finally {
      setClaimingId(null);
    }
  };

  // Calculate statistics
  const statistics = {
    totalEarned: attendanceData?.data
      ?.filter(r => r.payrollStatus === 'paid')
      ?.reduce((sum, r) => sum + parseFloat(r.amountUSD), 0) || 0,
    totalPending: attendanceData?.data
      ?.filter(r => r.payrollStatus === 'unpaid')
      ?.reduce((sum, r) => sum + parseFloat(r.amountUSD), 0) || 0,
    totalHours: attendanceData?.data
      ?.reduce((sum, r) => sum + parseFloat(r.totalWorkHours), 0) || 0,
    paidCount: attendanceData?.data?.filter(r => r.payrollStatus === 'paid')?.length || 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claim Salary</h1>
          <p className="text-sm text-gray-600 mt-1">
            Receive your salary in XRP for approved attendance
          </p>
        </div>
      </div>

      {/* Wallet not configured warning */}
      {attendanceData?.success && !attendanceData.employee?.hasWalletAddress && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                Wallet Address Not Set
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                Please configure your XRP wallet address to receive payments.
              </p>
              <Link
                href="/employee-dashboard/settings"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-1">
                An Error Occurred
              </h4>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Received</span>
            <CheckCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(statistics.totalEarned)}
          </p>
          <p className="text-xs opacity-75 mt-2">
            {statistics.paidCount} payments
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Claimable</span>
            <Wallet className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(statistics.totalPending)}
          </p>
          <p className="text-xs opacity-75 mt-2">
            Click to claim
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Total Hours</span>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {statistics.totalHours.toFixed(1)}h
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Approved attendance
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">XRP/USD Rate</span>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${attendanceData?.exchangeRate || '-'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Current rate
          </p>
        </div>
      </div>

      {/* Attendance list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : attendanceError ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load data</p>
            <p className="text-sm text-gray-600 mt-2">Please reload the page</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (USD)
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (XRP)
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!attendanceData?.data || attendanceData.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No approved attendance</p>
                        <p className="text-sm text-gray-400">
                          Records will appear here once approved by administrator
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendanceData.data.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.totalWorkHours}h
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(record.amountUSD)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-blue-600">
                          {formatXRP(record.estimatedXRP)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.payrollStatus)}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        {record.payrollStatus === 'unpaid' && (
                          <button
                            onClick={() => handleClaimPayment(record.id)}
                            disabled={claimingId === record.id || !record.hasWalletAddress}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {claimingId === record.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Wallet className="w-4 h-4" />
                                Claim XRP
                              </>
                            )}
                          </button>
                        )}
                        {record.payrollStatus === 'processing' && (
                          <span className="text-sm text-blue-600">Processing...</span>
                        )}
                        {record.payrollStatus === 'paid' && record.transactionHash && (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${record.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            title="View on XRPL Explorer"
                          >
                            <span className="hidden md:inline">View</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {record.payrollStatus === 'failed' && (
                          <button
                            onClick={() => handleClaimPayment(record.id)}
                            disabled={claimingId === record.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              About XRP Salary Claims
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>You can receive your salary in XRP for attendance approved by administrator</li>
              <li>Click &ldquo;Claim XRP&rdquo; button to instantly receive XRP payment</li>
              <li>XRP/USD exchange rate is calculated in real-time</li>
              <li>Transactions can be verified on the XRP Ledger</li>
              <li>Register your wallet address in the settings page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
