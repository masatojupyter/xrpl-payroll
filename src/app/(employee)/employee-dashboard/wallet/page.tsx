'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { Wallet, AlertCircle, CheckCircle, ExternalLink, Info, Copy, Check } from 'lucide-react';

// Validation schema
const walletAddressSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(
      /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
      'Invalid XRP wallet address format. Must start with "r" and be 25-35 characters long'
    ),
});

type WalletAddressForm = z.infer<typeof walletAddressSchema>;

// Types
type WalletAddressResponse = {
  success: boolean;
  walletAddress: string | null;
};

type WalletBalanceResponse = {
  success: boolean;
  walletAddress: string;
  balance: string;
};

type ExchangeRateResponse = {
  success: boolean;
  rate: number;
  currency: string;
  timestamp: string;
  source: string;
};

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch');
  }
  return response.json();
};

// Mask wallet address for display
function maskWalletAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function EmployeeWalletPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch wallet address
  const { data: walletData, error: walletError, mutate: mutateWallet } = useSWR<WalletAddressResponse>(
    '/api/employee/wallet-address',
    fetcher
  );

  // Fetch wallet balance (only if wallet is registered)
  const { data: balanceData, error: balanceError } = useSWR<WalletBalanceResponse>(
    walletData?.walletAddress ? '/api/xrp/wallet-balance' : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch exchange rate
  const { data: rateData } = useSWR<ExchangeRateResponse>(
    '/api/xrp/exchange-rate',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WalletAddressForm>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      walletAddress: walletData?.walletAddress || '',
    },
  });

  // Submit handler
  const onSubmit = async (data: WalletAddressForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await fetch('/api/employee/wallet-address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update wallet address');
      }

      setSubmitSuccess(true);
      await mutateWallet(); // Refresh wallet data

      // Reset form with new value
      const result = await response.json();
      reset({ walletAddress: result.walletAddress });

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update wallet address');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate USD value
  const usdValue = balanceData && rateData
    ? (parseFloat(balanceData.balance) * rateData.rate).toFixed(2)
    : null;

  // Copy wallet address to clipboard
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Wallet Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your XRP wallet address for receiving salary payments
        </p>
      </div>

      {/* Current Wallet Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Wallet Address</h2>
          {walletData?.walletAddress && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              <CheckCircle className="w-4 h-4" />
              Registered
            </span>
          )}
        </div>

        {walletError ? (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load wallet information</span>
          </div>
        ) : !walletData ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ) : walletData.walletAddress ? (
          <div className="space-y-4">
            
            {/* Full Address with Copy Button */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gray-400" />
                <label className="block text-xs font-medium text-gray-700">
                  Full Wallet Address
                </label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                  {walletData.walletAddress}
                </code>
                <button
                  type="button"
                  onClick={() => walletData.walletAddress && handleCopyAddress(walletData.walletAddress)}
                  className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                  title="Copy address"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {isCopied && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Address copied to clipboard!
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            <span>Not registered</span>
          </div>
        )}
      </div>

      {/* Wallet Balance */}
      {walletData?.walletAddress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>

          {balanceError ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {balanceError.message.includes('not found')
                      ? 'Wallet not yet activated'
                      : 'Unable to fetch balance'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {balanceError.message.includes('not found')
                      ? 'Fund your wallet with XRP from the testnet faucet to activate it.'
                      : 'Balance checking is temporarily unavailable. Your wallet address is registered and ready to receive payments.'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  <strong>Alternative:</strong> You can check your wallet balance directly at{' '}
                  <a
                    href={`https://testnet.xrpl.org/accounts/${walletData.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    XRP Testnet Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          ) : !balanceData ? (
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {parseFloat(balanceData.balance).toFixed(6)}
                </span>
                <span className="text-lg text-gray-500">XRP</span>
              </div>
              {usdValue && (
                <p className="text-sm text-gray-600">
                  ≈ ${usdValue} USD
                  {rateData && (
                    <span className="text-xs text-gray-400 ml-2">
                      (1 XRP = ${rateData.rate.toFixed(4)} USD)
                    </span>
                  )}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a
                  href={`https://testnet.xrpl.org/accounts/${walletData.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  View on XRP Testnet Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Address Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {walletData?.walletAddress ? 'Update' : 'Register'} Wallet Address
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
              XRP Wallet Address
            </label>
            <input
              type="text"
              id="walletAddress"
              {...register('walletAddress')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                errors.walletAddress ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="r35a57RRmfyLGLD9XbCRPLogo3yikEGvMD"
              disabled={isSubmitting}
            />
            {errors.walletAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.walletAddress.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter your XRP Ledger wallet address (starts with &quot;r&quot;)
            </p>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Wallet address updated successfully!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Wallet Address'}
          </button>
        </form>
      </div>

      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-amber-900">Security Notice</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Never enter your private key or seed phrase.</strong> Only provide your public wallet address.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Your wallet address is public information used only to receive payments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Keep your private keys and seed phrase secure and never share them with anyone.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* XRP Testnet Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-900">About XRP Testnet</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                This system uses <strong>XRP Testnet</strong>, a test network for development and testing purposes.
                Testnet XRP has no real-world value.
              </p>
              <div className="space-y-1">
                <p className="font-medium">Getting Started:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create a testnet wallet using one of these tools:</li>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>
                      <a
                        href="https://xrpl.org/xrp-testnet-faucet.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                      >
                        XRPL Testnet Faucet
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {' '}(Generates wallet + funds it)
                    </li>
                    <li>
                      <a
                        href="https://xumm.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                      >
                        XUMM Wallet
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {' '}(Mobile wallet app)
                    </li>
                  </ul>
                  <li>Copy your wallet address (starts with &quot;r&quot;)</li>
                  <li>Paste it in the form above and save</li>
                  <li>
                    If needed, get free testnet XRP from the{' '}
                    <a
                      href="https://xrpl.org/xrp-testnet-faucet.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      faucet
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
