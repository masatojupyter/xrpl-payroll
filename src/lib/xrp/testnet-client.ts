/**
 * XRP Testnet Client Service
 * 
 * This module provides functionality to connect to XRP Testnet,
 * send transactions, and manage wallet operations.
 * 
 * @module xrp/testnet-client
 */

import { Client, Wallet, xrpToDrops, dropsToXrp, isValidClassicAddress } from 'xrpl'
import { z } from 'zod'

/**
 * Environment variable schema for XRP Testnet configuration
 */
const envSchema = z.object({
  XRP_TESTNET_WALLET_ADDRESS: z.string().min(1, 'XRP_TESTNET_WALLET_ADDRESS is required'),
  XRP_TESTNET_WALLET_SECRET: z.string().min(1, 'XRP_TESTNET_WALLET_SECRET is required'),
  XRP_TESTNET_NETWORK: z.string().url().default('wss://s.altnet.rippletest.net:51233'),
})

/**
 * Validated environment variables
 */
type XRPEnvConfig = z.infer<typeof envSchema>

/**
 * Payment parameters for XRP transactions
 */
export interface SendXRPPaymentParams {
  /** Destination wallet address */
  toAddress: string
  /** Amount in XRP (e.g., "10.5") */
  amountXRP: string
  /** Optional memo to attach to the transaction */
  memo?: string
  /** Optional destination tag for exchanges */
  destinationTag?: number
}

/**
 * Payment result from sendXRPPayment
 */
export interface PaymentResult {
  /** Whether the payment was successful */
  success: boolean
  /** Transaction hash if successful */
  transactionHash?: string
  /** Ledger index where transaction was validated */
  ledgerIndex?: number
  /** Error message if failed */
  error?: string
}

/**
 * Transaction verification result
 */
export interface TransactionVerification {
  /** Whether the transaction is verified */
  verified: boolean
  /** Current status of the transaction */
  status: 'validated' | 'pending' | 'failed'
  /** Additional transaction details */
  details?: unknown
}

/**
 * Wallet balance result
 */
export interface WalletBalance {
  /** Balance in XRP */
  balance: string
  /** Error message if retrieval failed */
  error?: string
}

/**
 * Validates and retrieves XRP Testnet environment variables
 * 
 * @returns Validated environment configuration
 * @throws Error if required environment variables are missing or invalid
 */
function getEnvConfig(): XRPEnvConfig {
  try {
    const config = envSchema.parse({
      XRP_TESTNET_WALLET_ADDRESS: process.env.XRP_TESTNET_WALLET_ADDRESS,
      XRP_TESTNET_WALLET_SECRET: process.env.XRP_TESTNET_WALLET_SECRET,
      XRP_TESTNET_NETWORK: process.env.XRP_TESTNET_NETWORK,
    })
    return config
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ')
      throw new Error(`Missing or invalid environment variables: ${missingVars}`)
    }
    throw error
  }
}

/**
 * Validates an XRP Ledger wallet address format
 * 
 * Uses xrpl library's built-in validation which checks:
 * - Address format (starts with 'r')
 * - Base58 encoding
 * - Checksum validity
 * 
 * This is more reliable than regex-only validation as it verifies the checksum.
 * 
 * @param address - The wallet address to validate
 * @returns true if the address is valid (including checksum), false otherwise
 * 
 * @example
 * ```typescript
 * validateWalletAddress('r35a57RRmfyLGLD9XbCRPLogo3yikEGvMD') // true
 * validateWalletAddress('invalid_address') // false
 * validateWalletAddress('rMg2AK7e3FXLXUhgvt69JuzG25Q88JxAtD') // false (invalid checksum)
 * ```
 */
export function validateWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }

  try {
    // Use xrpl library's validation which includes checksum verification
    return isValidClassicAddress(address)
  } catch {
    return false
  }
}

/**
 * Connects to the XRP Testnet
 * 
 * Establishes a WebSocket connection to the configured XRP Testnet endpoint.
 * The connection should be properly closed using disconnectFromTestnet after use.
 * 
 * @returns A connected XRPL Client instance
 * @throws Error if connection fails or environment variables are missing
 * 
 * @example
 * ```typescript
 * const client = await connectToTestnet()
 * try {
 *   // Use client for operations
 * } finally {
 *   await disconnectFromTestnet(client)
 * }
 * ```
 */
export async function connectToTestnet(): Promise<Client> {
  try {
    // Validate environment variables
    const config = getEnvConfig()

    // Create client instance
    const client = new Client(config.XRP_TESTNET_NETWORK)

    // Connect to the network
    await client.connect()

    // Verify connection is established
    if (!client.isConnected()) {
      throw new Error('Failed to establish connection to XRP Testnet')
    }

    return client
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to connect to XRP Testnet: ${error.message}`)
    }
    throw new Error('Failed to connect to XRP Testnet: Unknown error')
  }
}

/**
 * Retrieves the XRP balance for a given wallet address using JSON-RPC API
 * This method uses HTTP requests instead of WebSocket to avoid compatibility issues
 * 
 * @param address - The wallet address to check balance for
 * @returns Object containing the balance in XRP or error message
 * 
 * @example
 * ```typescript
 * const result = await getWalletBalance('r35a57RRmfyLGLD9XbCRPLogo3yikEGvMD')
 * if (result.error) {
 *   console.error(result.error)
 * } else {
 *   console.log(`Balance: ${result.balance} XRP`)
 * }
 * ```
 */
export async function getWalletBalance(address: string): Promise<WalletBalance> {
  try {
    // Validate address format
    if (!validateWalletAddress(address)) {
      return {
        balance: '0',
        error: 'Invalid wallet address format'
      }
    }

    // Use JSON-RPC API instead of WebSocket
    const response = await fetch('https://s.altnet.rippletest.net:51234/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'account_info',
        params: [{
          account: address,
          ledger_index: 'validated'
        }]
      })
    })

    if (!response.ok) {
      return {
        balance: '0',
        error: `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()

    // Check for errors in the response
    if (data.result?.error) {
      if (data.result.error === 'actNotFound') {
        return {
          balance: '0',
          error: 'Account not found on the ledger. The account may need to be funded first.'
        }
      }
      return {
        balance: '0',
        error: `XRPL error: ${data.result.error_message || data.result.error}`
      }
    }

    // Convert drops to XRP
    const balanceInDrops = data.result.account_data.Balance
    const balanceInXRP = dropsToXrp(String(balanceInDrops))

    return {
      balance: String(balanceInXRP)
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        balance: '0',
        error: `Failed to retrieve balance: ${error.message}`
      }
    }
    
    return {
      balance: '0',
      error: 'Failed to retrieve balance: Unknown error'
    }
  }
}

/**
 * Sends an XRP payment from the configured wallet to a destination address
 * 
 * This function:
 * 1. Validates the destination address
 * 2. Creates and signs a payment transaction
 * 3. Submits the transaction to the ledger
 * 4. Waits for validation
 * 5. Returns the result with transaction details
 * 
 * @param params - Payment parameters including destination, amount, and optional memo
 * @returns Payment result with transaction hash or error
 * 
 * @example
 * ```typescript
 * const result = await sendXRPPayment({
 *   toAddress: 'r35a57RRmfyLGLD9XbCRPLogo3yikEGvMD',
 *   amountXRP: '10.5',
 *   memo: 'Salary payment',
 *   destinationTag: 12345
 * })
 * 
 * if (result.success) {
 *   console.log(`Payment successful: ${result.transactionHash}`)
 * } else {
 *   console.error(`Payment failed: ${result.error}`)
 * }
 * ```
 */
export async function sendXRPPayment(params: SendXRPPaymentParams): Promise<PaymentResult> {
  let client: Client | null = null

  try {
    const { toAddress, amountXRP, memo, destinationTag } = params

    // Validate destination address
    if (!validateWalletAddress(toAddress)) {
      return {
        success: false,
        error: 'Invalid destination wallet address'
      }
    }

    // Validate amount
    const amount = parseFloat(amountXRP)
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount: must be a positive number'
      }
    }

    // Get environment config
    const config = getEnvConfig()

    // Connect to testnet
    client = await connectToTestnet()

    // Create wallet from secret
    const wallet = Wallet.fromSeed(config.XRP_TESTNET_WALLET_SECRET)

    // Verify wallet address matches config
    if (wallet.address !== config.XRP_TESTNET_WALLET_ADDRESS) {
      return {
        success: false,
        error: 'Wallet address mismatch: secret does not match configured address'
      }
    }

    // Check sender balance
    const balanceResult = await getWalletBalance(wallet.address)
    if (balanceResult.error) {
      return {
        success: false,
        error: `Failed to check sender balance: ${balanceResult.error}`
      }
    }

    const senderBalance = parseFloat(balanceResult.balance)
    if (senderBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance: available ${senderBalance} XRP, required ${amount} XRP`
      }
    }

    // Prepare payment transaction
    const payment: {
      TransactionType: 'Payment'
      Account: string
      Amount: string
      Destination: string
      DestinationTag?: number
      Memos?: Array<{
        Memo: {
          MemoData: string
        }
      }>
    } = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Amount: xrpToDrops(amountXRP),
      Destination: toAddress,
    }

    // Add destination tag if provided
    if (destinationTag !== undefined) {
      payment.DestinationTag = destinationTag
    }

    // Add memo if provided
    if (memo) {
      // Convert memo to hex
      const memoHex = Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
      payment.Memos = [
        {
          Memo: {
            MemoData: memoHex
          }
        }
      ]
    }

    // Submit transaction and wait for validation
    const response = await client.submitAndWait(payment, { wallet })

    // Check transaction result
    const result = response.result
    
    if (result.meta && typeof result.meta === 'object' && 'TransactionResult' in result.meta) {
      const txResult = result.meta.TransactionResult
      
      if (txResult === 'tesSUCCESS') {
        return {
          success: true,
          transactionHash: result.hash,
          ledgerIndex: result.ledger_index
        }
      } else {
        return {
          success: false,
          error: `Transaction failed with code: ${txResult}`
        }
      }
    }

    return {
      success: false,
      error: 'Transaction result is unclear'
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: `Payment failed: ${error.message}`
      }
    }
    
    return {
      success: false,
      error: 'Payment failed: Unknown error'
    }
  } finally {
    // Always disconnect
    if (client) {
      await disconnectFromTestnet(client)
    }
  }
}

/**
 * Verifies a transaction by its hash and returns its current status
 * 
 * @param txHash - The transaction hash to verify
 * @returns Verification result with status and details
 * 
 * @example
 * ```typescript
 * const verification = await verifyTransaction('ABC123...')
 * 
 * if (verification.verified && verification.status === 'validated') {
 *   console.log('Transaction confirmed on ledger')
 * } else if (verification.status === 'pending') {
 *   console.log('Transaction is still pending')
 * } else {
 *   console.log('Transaction failed')
 * }
 * ```
 */
export async function verifyTransaction(txHash: string): Promise<TransactionVerification> {
  let client: Client | null = null

  try {
    // Validate transaction hash format
    if (!txHash || typeof txHash !== 'string' || txHash.length !== 64) {
      return {
        verified: false,
        status: 'failed',
        details: { error: 'Invalid transaction hash format' }
      }
    }

    // Connect to testnet
    client = await connectToTestnet()

    // Request transaction details
    const response = await client.request({
      command: 'tx',
      transaction: txHash
    })

    const tx = response.result

    // Check if transaction is validated
    if (tx.validated === true) {
      // Check transaction result
      const meta = tx.meta
      
      if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
        const txResult = meta.TransactionResult
        
        if (txResult === 'tesSUCCESS') {
          return {
            verified: true,
            status: 'validated',
            details: {
              hash: tx.hash,
              ledgerIndex: tx.ledger_index,
              date: tx.date,
              fee: tx.tx_json.Fee,
              account: tx.tx_json.Account,
              destination: 'Destination' in tx.tx_json ? tx.tx_json.Destination : undefined,
              amount: 'Amount' in tx.tx_json ? tx.tx_json.Amount : undefined,
            }
          }
        } else {
          return {
            verified: true,
            status: 'failed',
            details: {
              hash: tx.hash,
              error: `Transaction failed: ${txResult}`
            }
          }
        }
      }
    }

    // Transaction exists but not yet validated
    return {
      verified: false,
      status: 'pending',
      details: {
        hash: tx.hash,
        message: 'Transaction is pending validation'
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      // Transaction not found
      if (error.message.includes('txnNotFound')) {
        return {
          verified: false,
          status: 'failed',
          details: { error: 'Transaction not found on the ledger' }
        }
      }

      return {
        verified: false,
        status: 'failed',
        details: { error: `Verification failed: ${error.message}` }
      }
    }

    return {
      verified: false,
      status: 'failed',
      details: { error: 'Verification failed: Unknown error' }
    }
  } finally {
    // Always disconnect
    if (client) {
      await disconnectFromTestnet(client)
    }
  }
}

/**
 * Disconnects from the XRP Testnet and cleans up resources
 * 
 * This should always be called after finishing operations with a client
 * to properly close the WebSocket connection and free resources.
 * 
 * @param client - The XRPL Client instance to disconnect
 * 
 * @example
 * ```typescript
 * const client = await connectToTestnet()
 * try {
 *   // Perform operations
 * } finally {
 *   await disconnectFromTestnet(client)
 * }
 * ```
 */
export async function disconnectFromTestnet(client: Client): Promise<void> {
  try {
    if (client && client.isConnected()) {
      await client.disconnect()
    }
  } catch (error) {
    // Log error but don't throw - disconnection failures shouldn't break the flow
    console.error('Error disconnecting from XRP Testnet:', error)
  }
}
