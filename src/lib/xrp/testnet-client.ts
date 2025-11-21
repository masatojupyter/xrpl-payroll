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
  console.log('[getEnvConfig] Starting environment config validation')
  console.log('[getEnvConfig] XRP_TESTNET_WALLET_ADDRESS exists:', !!process.env.XRP_TESTNET_WALLET_ADDRESS)
  console.log('[getEnvConfig] XRP_TESTNET_WALLET_SECRET exists:', !!process.env.XRP_TESTNET_WALLET_SECRET)
  console.log('[getEnvConfig] XRP_TESTNET_NETWORK:', process.env.XRP_TESTNET_NETWORK || 'not set')
  
  try {
    const config = envSchema.parse({
      XRP_TESTNET_WALLET_ADDRESS: process.env.XRP_TESTNET_WALLET_ADDRESS,
      XRP_TESTNET_WALLET_SECRET: process.env.XRP_TESTNET_WALLET_SECRET,
      XRP_TESTNET_NETWORK: process.env.XRP_TESTNET_NETWORK,
    })
    console.log('[getEnvConfig] ✓ Environment config validated successfully')
    console.log('[getEnvConfig] Network:', config.XRP_TESTNET_NETWORK)
    console.log('[getEnvConfig] Wallet address:', config.XRP_TESTNET_WALLET_ADDRESS)
    return config
  } catch (error) {
    console.error('[getEnvConfig] ✗ Validation failed:', error)
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ')
      console.error('[getEnvConfig] Missing variables:', missingVars)
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
  console.log('[validateWalletAddress] Validating address:', address)
  
  if (!address || typeof address !== 'string') {
    console.log('[validateWalletAddress] ✗ Invalid input - not a string or empty')
    return false
  }

  try {
    // Use xrpl library's validation which includes checksum verification
    const isValid = isValidClassicAddress(address)
    console.log('[validateWalletAddress]', isValid ? '✓' : '✗', 'Address validation result:', isValid)
    return isValid
  } catch (error) {
    console.error('[validateWalletAddress] ✗ Validation error:', error)
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
  console.log('[connectToTestnet] Starting connection to XRP Testnet')
  
  try {
    // Validate environment variables
    console.log('[connectToTestnet] Validating environment variables...')
    const config = getEnvConfig()
    console.log('[connectToTestnet] ✓ Environment variables validated')

    // Create client instance
    console.log('[connectToTestnet] Creating client instance for network:', config.XRP_TESTNET_NETWORK)
    const client = new Client(config.XRP_TESTNET_NETWORK)
    console.log('[connectToTestnet] ✓ Client instance created')

    // Connect to the network
    console.log('[connectToTestnet] Connecting to network...')
    await client.connect()
    console.log('[connectToTestnet] ✓ Connection attempt completed')

    // Verify connection is established
    const isConnected = client.isConnected()
    console.log('[connectToTestnet] Connection status:', isConnected)
    
    if (!isConnected) {
      console.error('[connectToTestnet] ✗ Connection verification failed')
      throw new Error('Failed to establish connection to XRP Testnet')
    }

    console.log('[connectToTestnet] ✓ Successfully connected to XRP Testnet')
    return client
  } catch (error) {
    console.error('[connectToTestnet] ✗ Connection failed:', error)
    if (error instanceof Error) {
      console.error('[connectToTestnet] Error message:', error.message)
      console.error('[connectToTestnet] Error stack:', error.stack)
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
  console.log('[getWalletBalance] Starting balance retrieval for address:', address)
  
  try {
    // Validate address format
    console.log('[getWalletBalance] Validating address format...')
    if (!validateWalletAddress(address)) {
      console.log('[getWalletBalance] ✗ Address validation failed')
      return {
        balance: '0',
        error: 'Invalid wallet address format'
      }
    }
    console.log('[getWalletBalance] ✓ Address format validated')

    // Use JSON-RPC API instead of WebSocket
    const apiUrl = 'https://s.altnet.rippletest.net:51234/'
    const requestBody = {
      method: 'account_info',
      params: [{
        account: address,
        ledger_index: 'validated'
      }]
    }
    
    console.log('[getWalletBalance] Sending request to:', apiUrl)
    console.log('[getWalletBalance] Request body:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('[getWalletBalance] Response status:', response.status)
    console.log('[getWalletBalance] Response ok:', response.ok)
    
    if (!response.ok) {
      console.error('[getWalletBalance] ✗ HTTP error:', response.status)
      return {
        balance: '0',
        error: `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()
    console.log('[getWalletBalance] Response data:', JSON.stringify(data, null, 2))

    // Check for errors in the response
    if (data.result?.error) {
      console.error('[getWalletBalance] ✗ XRPL error:', data.result.error)
      if (data.result.error === 'actNotFound') {
        console.log('[getWalletBalance] Account not found on ledger')
        return {
          balance: '0',
          error: 'Account not found on the ledger. The account may need to be funded first.'
        }
      }
      console.error('[getWalletBalance] Error message:', data.result.error_message || data.result.error)
      return {
        balance: '0',
        error: `XRPL error: ${data.result.error_message || data.result.error}`
      }
    }

    // Convert drops to XRP
    const balanceInDrops = data.result.account_data.Balance
    console.log('[getWalletBalance] Balance in drops:', balanceInDrops)
    
    const balanceInXRP = dropsToXrp(String(balanceInDrops))
    console.log('[getWalletBalance] Balance in XRP:', balanceInXRP)
    console.log('[getWalletBalance] ✓ Successfully retrieved balance')

    return {
      balance: String(balanceInXRP)
    }
  } catch (error) {
    console.error('[getWalletBalance] ✗ Exception caught:', error)
    if (error instanceof Error) {
      console.error('[getWalletBalance] Error message:', error.message)
      console.error('[getWalletBalance] Error stack:', error.stack)
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
  console.log('[sendXRPPayment] ========== Starting XRP Payment ==========')
  console.log('[sendXRPPayment] Payment params:', JSON.stringify(params, null, 2))
  
  let client: Client | null = null

  try {
    const { toAddress, amountXRP, memo, destinationTag } = params
    console.log('[sendXRPPayment] To address:', toAddress)
    console.log('[sendXRPPayment] Amount (XRP):', amountXRP)
    console.log('[sendXRPPayment] Memo:', memo || 'none')
    console.log('[sendXRPPayment] Destination tag:', destinationTag || 'none')

    // Validate destination address
    console.log('[sendXRPPayment] Validating destination address...')
    if (!validateWalletAddress(toAddress)) {
      console.error('[sendXRPPayment] ✗ Invalid destination address')
      return {
        success: false,
        error: 'Invalid destination wallet address'
      }
    }
    console.log('[sendXRPPayment] ✓ Destination address validated')

    // Validate amount
    console.log('[sendXRPPayment] Validating amount...')
    const amount = parseFloat(amountXRP)
    console.log('[sendXRPPayment] Parsed amount:', amount)
    
    if (isNaN(amount) || amount <= 0) {
      console.error('[sendXRPPayment] ✗ Invalid amount:', amount)
      return {
        success: false,
        error: 'Invalid amount: must be a positive number'
      }
    }
    console.log('[sendXRPPayment] ✓ Amount validated')

    // Get environment config
    console.log('[sendXRPPayment] Getting environment config...')
    const config = getEnvConfig()
    console.log('[sendXRPPayment] ✓ Environment config loaded')

    // Connect to testnet
    console.log('[sendXRPPayment] Connecting to testnet...')
    client = await connectToTestnet()
    console.log('[sendXRPPayment] ✓ Connected to testnet')

    // Create wallet from secret
    console.log('[sendXRPPayment] Creating wallet from secret...')
    const wallet = Wallet.fromSecret(config.XRP_TESTNET_WALLET_SECRET) 
    console.log('[sendXRPPayment] ✓ Wallet created')
    console.log('[sendXRPPayment] Wallet address:', wallet.address)

    // Verify wallet address matches config
    console.log('[sendXRPPayment] Verifying wallet address matches config...')
    console.log('[sendXRPPayment] Expected:', config.XRP_TESTNET_WALLET_ADDRESS)
    console.log('[sendXRPPayment] Actual:', wallet.address)
    
    if (wallet.address !== config.XRP_TESTNET_WALLET_ADDRESS) {
      console.error('[sendXRPPayment] ✗ Wallet address mismatch!')
      return {
        success: false,
        error: 'Wallet address mismatch: secret does not match configured address'
      }
    }
    console.log('[sendXRPPayment] ✓ Wallet address verified')

    // Check sender balance
    console.log('[sendXRPPayment] Checking sender balance...')
    const balanceResult = await getWalletBalance(wallet.address)
    console.log('[sendXRPPayment] Balance result:', balanceResult)
    
    if (balanceResult.error) {
      console.error('[sendXRPPayment] ✗ Failed to check balance:', balanceResult.error)
      return {
        success: false,
        error: `Failed to check sender balance: ${balanceResult.error}`
      }
    }

    const senderBalance = parseFloat(balanceResult.balance)
    console.log('[sendXRPPayment] Sender balance:', senderBalance, 'XRP')
    console.log('[sendXRPPayment] Required amount:', amount, 'XRP')
    
    if (senderBalance < amount) {
      console.error('[sendXRPPayment] ✗ Insufficient balance')
      return {
        success: false,
        error: `Insufficient balance: available ${senderBalance} XRP, required ${amount} XRP`
      }
    }
    console.log('[sendXRPPayment] ✓ Sufficient balance confirmed')

    // Prepare payment transaction
    console.log('[sendXRPPayment] Preparing payment transaction...')
    const amountInDrops = xrpToDrops(amountXRP)
    console.log('[sendXRPPayment] Amount in drops:', amountInDrops)
    
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
      Amount: amountInDrops,
      Destination: toAddress,
    }

    // Add destination tag if provided
    if (destinationTag !== undefined) {
      console.log('[sendXRPPayment] Adding destination tag:', destinationTag)
      payment.DestinationTag = destinationTag
    }

    // Add memo if provided
    if (memo) {
      // Convert memo to hex
      console.log('[sendXRPPayment] Adding memo:', memo)
      const memoHex = Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
      console.log('[sendXRPPayment] Memo (hex):', memoHex)
      payment.Memos = [
        {
          Memo: {
            MemoData: memoHex
          }
        }
      ]
    }

    console.log('[sendXRPPayment] Payment transaction prepared:', JSON.stringify(payment, null, 2))

    // Submit transaction and wait for validation
    console.log('[sendXRPPayment] Submitting transaction and waiting for validation...')
    const response = await client.submitAndWait(payment, { wallet })
    console.log('[sendXRPPayment] ✓ Transaction submitted')
    console.log('[sendXRPPayment] Response:', JSON.stringify(response, null, 2))

    // Check transaction result
    const result = response.result
    console.log('[sendXRPPayment] Checking transaction result...')
    console.log('[sendXRPPayment] Result hash:', result.hash)
    console.log('[sendXRPPayment] Result ledger_index:', result.ledger_index)
    
    if (result.meta && typeof result.meta === 'object' && 'TransactionResult' in result.meta) {
      const txResult = result.meta.TransactionResult
      console.log('[sendXRPPayment] Transaction result code:', txResult)
      
      if (txResult === 'tesSUCCESS') {
        console.log('[sendXRPPayment] ✓✓✓ Payment successful! ✓✓✓')
        return {
          success: true,
          transactionHash: result.hash,
          ledgerIndex: result.ledger_index
        }
      } else {
        console.error('[sendXRPPayment] ✗ Transaction failed with code:', txResult)
        return {
          success: false,
          error: `Transaction failed with code: ${txResult}`
        }
      }
    }

    console.error('[sendXRPPayment] ✗ Transaction result is unclear')
    console.error('[sendXRPPayment] Meta:', result.meta)
    return {
      success: false,
      error: 'Transaction result is unclear'
    }
  } catch (error) {
    console.error('[sendXRPPayment] ✗✗✗ Exception caught! ✗✗✗')
    console.error('[sendXRPPayment] Error:', error)
    
    if (error instanceof Error) {
      console.error('[sendXRPPayment] Error name:', error.name)
      console.error('[sendXRPPayment] Error message:', error.message)
      console.error('[sendXRPPayment] Error stack:', error.stack)
      return {
        success: false,
        error: `Payment failed: ${error.message}`
      }
    }
    
    console.error('[sendXRPPayment] Unknown error type')
    return {
      success: false,
      error: 'Payment failed: Unknown error'
    }
  } finally {
    // Always disconnect
    console.log('[sendXRPPayment] Cleaning up...')
    if (client) {
      console.log('[sendXRPPayment] Disconnecting from testnet...')
      await disconnectFromTestnet(client)
      console.log('[sendXRPPayment] ✓ Disconnected')
    }
    console.log('[sendXRPPayment] ========== Payment Process Complete ==========')
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
  console.log('[verifyTransaction] ========== Starting Transaction Verification ==========')
  console.log('[verifyTransaction] Transaction hash:', txHash)
  
  let client: Client | null = null

  try {
    // Validate transaction hash format
    console.log('[verifyTransaction] Validating transaction hash format...')
    console.log('[verifyTransaction] Hash length:', txHash?.length)
    console.log('[verifyTransaction] Hash type:', typeof txHash)
    
    if (!txHash || typeof txHash !== 'string' || txHash.length !== 64) {
      console.error('[verifyTransaction] ✗ Invalid transaction hash format')
      return {
        verified: false,
        status: 'failed',
        details: { error: 'Invalid transaction hash format' }
      }
    }
    console.log('[verifyTransaction] ✓ Hash format validated')

    // Connect to testnet
    console.log('[verifyTransaction] Connecting to testnet...')
    client = await connectToTestnet()
    console.log('[verifyTransaction] ✓ Connected to testnet')

    // Request transaction details
    console.log('[verifyTransaction] Requesting transaction details...')
    const response = await client.request({
      command: 'tx',
      transaction: txHash
    })
    console.log('[verifyTransaction] ✓ Transaction details received')
    console.log('[verifyTransaction] Response:', JSON.stringify(response, null, 2))

    const tx = response.result
    console.log('[verifyTransaction] Transaction validated status:', tx.validated)

    // Check if transaction is validated
    if (tx.validated === true) {
      console.log('[verifyTransaction] ✓ Transaction is validated')
      
      // Check transaction result
      const meta = tx.meta
      console.log('[verifyTransaction] Checking transaction result...')
      console.log('[verifyTransaction] Meta exists:', !!meta)
      console.log('[verifyTransaction] Meta type:', typeof meta)
      
      if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
        const txResult = meta.TransactionResult
        console.log('[verifyTransaction] Transaction result code:', txResult)
        
        if (txResult === 'tesSUCCESS') {
          console.log('[verifyTransaction] ✓✓✓ Transaction successful! ✓✓✓')
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
          console.error('[verifyTransaction] ✗ Transaction failed with code:', txResult)
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
    console.log('[verifyTransaction] Transaction exists but not yet validated')
    return {
      verified: false,
      status: 'pending',
      details: {
        hash: tx.hash,
        message: 'Transaction is pending validation'
      }
    }
  } catch (error) {
    console.error('[verifyTransaction] ✗✗✗ Exception caught! ✗✗✗')
    console.error('[verifyTransaction] Error:', error)
    
    if (error instanceof Error) {
      console.error('[verifyTransaction] Error name:', error.name)
      console.error('[verifyTransaction] Error message:', error.message)
      console.error('[verifyTransaction] Error stack:', error.stack)
      
      // Transaction not found
      if (error.message.includes('txnNotFound')) {
        console.log('[verifyTransaction] Transaction not found on ledger')
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

    console.error('[verifyTransaction] Unknown error type')
    return {
      verified: false,
      status: 'failed',
      details: { error: 'Verification failed: Unknown error' }
    }
  } finally {
    // Always disconnect
    console.log('[verifyTransaction] Cleaning up...')
    if (client) {
      console.log('[verifyTransaction] Disconnecting from testnet...')
      await disconnectFromTestnet(client)
      console.log('[verifyTransaction] ✓ Disconnected')
    }
    console.log('[verifyTransaction] ========== Verification Process Complete ==========')
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
  console.log('[disconnectFromTestnet] Starting disconnection...')
  
  try {
    if (client && client.isConnected()) {
      console.log('[disconnectFromTestnet] Client is connected, disconnecting...')
      await client.disconnect()
      console.log('[disconnectFromTestnet] ✓ Successfully disconnected')
    } else {
      console.log('[disconnectFromTestnet] Client is already disconnected or null')
    }
  } catch (error) {
    // Log error but don't throw - disconnection failures shouldn't break the flow
    console.error('[disconnectFromTestnet] ✗ Error during disconnection:', error)
    if (error instanceof Error) {
      console.error('[disconnectFromTestnet] Error message:', error.message)
    }
  }
}
