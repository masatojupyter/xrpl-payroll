/**
 * XRP Wallet Management
 * Mock implementation for wallet operations
 */

import { isValidClassicAddress } from 'xrpl';

export interface WalletBalance {
  rlusd: string;
  xrp: string;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  currency: 'XRP' | 'XRP';
  from: string;
  to: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  description?: string;
}

export interface WalletInfo {
  address: string;
  balance: WalletBalance;
  isConnected: boolean;
}

/**
 * Mock wallet data storage
 */
const mockWallets = new Map<string, WalletInfo>();

/**
 * Mock transaction history storage
 */
const mockTransactions = new Map<string, Transaction[]>();

/**
 * Initialize mock wallet with default balance
 */
function initializeMockWallet(address: string): WalletInfo {
  const wallet: WalletInfo = {
    address,
    balance: {
      rlusd: '50000.00', // Mock starting balance
      xrp: '100.00',
      lastUpdated: new Date(),
    },
    isConnected: true,
  };
  mockWallets.set(address, wallet);
  mockTransactions.set(address, []);
  return wallet;
}

/**
 * Validate XRP Ledger wallet address
 * Uses xrpl library's built-in validation which checks checksum
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  try {
    // Use xrpl library's validation which includes checksum verification
    return isValidClassicAddress(address);
  } catch {
    return false;
  }
}

/**
 * Get wallet balance (mock implementation)
 */
export async function getWalletBalance(address: string): Promise<WalletBalance | null> {
  try {
    if (!isValidWalletAddress(address)) {
      throw new Error('Invalid wallet address');
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get or create mock wallet
    let wallet = mockWallets.get(address);
    if (!wallet) {
      wallet = initializeMockWallet(address);
    }

    return {
      ...wallet.balance,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return null;
  }
}

/**
 * Connect to wallet (mock implementation)
 */
export async function connectWallet(address: string): Promise<WalletInfo | null> {
  try {
    if (!isValidWalletAddress(address)) {
      throw new Error('Invalid wallet address');
    }

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Get or create mock wallet
    let wallet = mockWallets.get(address);
    if (!wallet) {
      wallet = initializeMockWallet(address);
    }

    wallet.isConnected = true;
    mockWallets.set(address, wallet);

    return wallet;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return null;
  }
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(address: string): void {
  const wallet = mockWallets.get(address);
  if (wallet) {
    wallet.isConnected = false;
    mockWallets.set(address, wallet);
  }
}

/**
 * Send XRP transaction (mock implementation)
 */
export async function sendXRP(
  fromAddress: string,
  toAddress: string,
  amount: string,
  description?: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    // Validate addresses
    if (!isValidWalletAddress(fromAddress)) {
      throw new Error('Invalid sender address');
    }
    if (!isValidWalletAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    // Check balance
    const wallet = mockWallets.get(fromAddress);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance.rlusd);
    if (currentBalance < amountNum) {
      throw new Error('Insufficient balance');
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate mock transaction hash
    const transactionHash = `XRP_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Simulate 95% success rate
    const isSuccess = Math.random() < 0.95;

    if (!isSuccess) {
      throw new Error('Transaction failed: Network timeout');
    }

    // Update sender balance
    wallet.balance.rlusd = (currentBalance - amountNum).toFixed(2);
    wallet.balance.lastUpdated = new Date();
    mockWallets.set(fromAddress, wallet);

    // Add transaction to sender's history
    const senderTransaction: Transaction = {
      id: transactionHash,
      type: 'send',
      amount: amount,
      currency: 'XRP',
      from: fromAddress,
      to: toAddress,
      timestamp: new Date(),
      status: 'completed',
      transactionHash,
      description,
    };

    const senderTransactions = mockTransactions.get(fromAddress) || [];
    senderTransactions.unshift(senderTransaction);
    mockTransactions.set(fromAddress, senderTransactions);

    // Add transaction to recipient's history
    const recipientTransaction: Transaction = {
      id: transactionHash,
      type: 'receive',
      amount: amount,
      currency: 'XRP',
      from: fromAddress,
      to: toAddress,
      timestamp: new Date(),
      status: 'completed',
      transactionHash,
      description,
    };

    const recipientTransactions = mockTransactions.get(toAddress) || [];
    recipientTransactions.unshift(recipientTransaction);
    mockTransactions.set(toAddress, recipientTransactions);

    // Update recipient balance
    let recipientWallet = mockWallets.get(toAddress);
    if (!recipientWallet) {
      recipientWallet = initializeMockWallet(toAddress);
    }
    const recipientBalance = parseFloat(recipientWallet.balance.rlusd);
    recipientWallet.balance.rlusd = (recipientBalance + amountNum).toFixed(2);
    recipientWallet.balance.lastUpdated = new Date();
    mockWallets.set(toAddress, recipientWallet);

    return {
      success: true,
      transactionHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get transaction history for a wallet (mock implementation)
 */
export async function getTransactionHistory(
  address: string,
  limit: number = 50
): Promise<Transaction[]> {
  try {
    if (!isValidWalletAddress(address)) {
      throw new Error('Invalid wallet address');
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transactions = mockTransactions.get(address) || [];
    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

/**
 * Verify transaction status (mock implementation)
 */
export async function verifyTransaction(transactionHash: string): Promise<{
  exists: boolean;
  status?: 'pending' | 'completed' | 'failed';
  transaction?: Transaction;
}> {
  try {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Search through all transactions
    for (const [, transactions] of mockTransactions) {
      const transaction = transactions.find(tx => tx.transactionHash === transactionHash);
      if (transaction) {
        return {
          exists: true,
          status: transaction.status,
          transaction,
        };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { exists: false };
  }
}

/**
 * Get estimated transaction fee (mock implementation)
 */
export function getEstimatedFee(): { xrp: string; rlusd: string } {
  return {
    xrp: '0.00001', // Network fee in XRP
    rlusd: '0.00', // No additional fee for XRP
  };
}

/**
 * Format wallet address for display (shortened)
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format XRP amount with proper decimals
 */
export function formatXRP(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Parse XRP amount from string
 */
export function parseXRP(amount: string): number {
  const cleaned = amount.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}
