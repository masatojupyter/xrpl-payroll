'use client';

import { CheckCircle, XCircle, Loader2, X, ExternalLink } from 'lucide-react';

interface TransactionStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionHash: string | null;
  error: string | null;
  onClose: () => void;
}

export function TransactionStatus({
  status,
  transactionHash,
  error,
  onClose,
}: TransactionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Payment Pending',
          message: 'Preparing to process payroll payment...',
          showClose: false,
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Processing Payment',
          message: 'Broadcasting transaction to XRP Ledger. Please wait...',
          showClose: false,
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Payment Completed',
          message: 'Payroll payment has been successfully processed on the XRP Ledger.',
          showClose: true,
        };
      case 'failed':
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Payment Failed',
          message: error || 'An error occurred while processing the payment. Please try again.',
          showClose: true,
        };
      default:
        return {
          icon: <Loader2 className="w-6 h-6 text-gray-600" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Processing',
          message: 'Processing...',
          showClose: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-lg animate-in slide-in-from-top-4 duration-300`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">{config.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-700 mt-1">{config.message}</p>

              {/* Transaction Hash Link */}
              {transactionHash && (
                <div className="mt-3">
                  <a
                    href={`https://testnet.xrpl.org/transactions/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    <span>View on XRP Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                    {transactionHash}
                  </p>
                </div>
              )}

              {/* Processing Steps */}
              {(status === 'pending' || status === 'processing') && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status === 'pending' || status === 'processing'
                          ? 'bg-blue-600 animate-pulse'
                          : 'bg-gray-300'
                      }`}
                    />
                    <span>
                      {status === 'pending'
                        ? 'Initializing payment...'
                        : 'Transaction submitted to network'}
                    </span>
                  </div>
                  {status === 'processing' && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span>Waiting for confirmation...</span>
                      </div>
                      <p className="text-xs text-gray-500 italic ml-4">
                        This may take a few moments
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Error Details */}
              {status === 'failed' && error && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800 font-mono break-words">
                  {error}
                </div>
              )}
            </div>

            {/* Close Button */}
            {config.showClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar for Processing */}
      {(status === 'pending' || status === 'processing') && (
        <div className="mt-4">
          <div className="h-1 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-progress-bar" />
          </div>
        </div>
      )}
    </div>
  );
}
