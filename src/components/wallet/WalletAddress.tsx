'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, Wallet } from 'lucide-react';
import { formatAddress, isValidWalletAddress } from '@/lib/rlusd/wallet';

interface WalletAddressProps {
  address: string;
  label?: string;
  showFullAddress?: boolean;
  showCopyButton?: boolean;
  showExplorerLink?: boolean;
  className?: string;
}

export default function WalletAddress({
  address,
  label = 'Wallet Address',
  showFullAddress = false,
  showCopyButton = true,
  showExplorerLink = true,
  className = '',
}: WalletAddressProps) {
  const [copied, setCopied] = useState(false);

  const isValid = isValidWalletAddress(address);
  const displayAddress = showFullAddress ? address : formatAddress(address);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleExplorerLink = () => {
    // Mock explorer link - in production, this would link to actual XRP Ledger explorer
    const explorerUrl = `https://livenet.xrpl.org/accounts/${address}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  if (!address) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <Wallet className="h-4 w-4" />
        {label}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          {isValid ? (
            <code className="block rounded bg-gray-50 px-3 py-2 text-sm font-mono text-gray-900">
              {displayAddress}
            </code>
          ) : (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              Invalid address format
            </div>
          )}
        </div>

        {isValid && (
          <div className="flex gap-1">
            {showCopyButton && (
              <button
                onClick={handleCopy}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}

            {showExplorerLink && (
              <button
                onClick={handleExplorerLink}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="View on XRP Ledger Explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {copied && (
        <div className="mt-2 text-xs text-green-600">
          Address copied to clipboard
        </div>
      )}

      {isValid && address.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          XRP Ledger Address
        </div>
      )}
    </div>
  );
}
