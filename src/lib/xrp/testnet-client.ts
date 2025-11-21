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
 * Connects to the XRP Testnet with retry mechanism
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

    // Connect to the network with retries
    console.log('[connectToTestnet] Connecting to network...')
    const maxRetries = 3
    let retryCount = 0
    let lastError: Error | null = null

    while (retryCount < maxRetries) {
      try {
        console.log(`[connectToTestnet] Connection attempt ${retryCount + 1}/${maxRetries}`)
        await client.connect()
        console.log('[connectToTestnet] ✓ Connection attempt completed')

        // Wait a bit for the connection to fully establish
        console.log('[connectToTestnet] Waiting for connection to stabilize...')
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Verify connection is established
        const isConnected = client.isConnected()
        console.log('[connectToTestnet] Connection status:', isConnected)
        
        if (!isConnected) {
          throw new Error('Connection check failed after connect()')
        }

        // Test the connection with a simple request
        console.log('[connectToTestnet] Testing connection with server_info request...')
        await client.request({ command: 'server_info' })
        console.log('[connectToTestnet] ✓ Connection test successful')

        console.log('[connectToTestnet] ✓ Successfully connected to XRP Testnet')
        return client
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown connection error')
        console.error(`[connectToTestnet] ✗ Connection attempt ${retryCount + 1} failed:`, lastError.message)
        
        retryCount++
        
        if (retryCount < maxRetries) {
          const waitTime = retryCount * 1000 // Exponential backoff: 1s, 2s, 3s
          console.log(`[connectToTestnet] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // All retries failed
    console.error('[connectToTestnet] ✗ All connection attempts failed')
    throw new Error(`Failed to connect to XRP Testnet after ${maxRetries} attempts: ${lastError?.message}`)
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
 * Sends an XRP payment from the configured wallet to a destination address using JSON-RPC API
 * 
 * This function uses HTTP-based JSON-RPC instead of WebSocket to avoid compatibility issues
 * in Next.js server environment.
 * 
 * @param params - Payment parameters including destination, amount, and optional memo
 * @returns Payment result with transaction hash or error
 */
export async function sendXRPPayment(params: SendXRPPaymentParams): Promise<PaymentResult> {
  console.log('[sendXRPPayment] ========== Starting XRP Payment (JSON-RPC) ==========')
  console.log('[sendXRPPayment] Payment params:', JSON.stringify(params, null, 2))

  const apiUrl = 'https://s.altnet.rippletest.net:51234/'

  try {
    const { toAddress, amountXRP, memo, destinationTag } = params

    // Validate destination address
    if (!validateWalletAddress(toAddress)) {
      return { success: false, error: 'Invalid destination wallet address' }
    }

    // Validate amount
    const amount = parseFloat(amountXRP)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount: must be a positive number' }
    }

    // Get environment config
    const config = getEnvConfig()

    // Create wallet from secret
    const wallet = Wallet.fromSecret(config.XRP_TESTNET_WALLET_SECRET)
    console.log('[sendXRPPayment] Wallet address:', wallet.address)

    // Verify wallet address matches config
    if (wallet.address !== config.XRP_TESTNET_WALLET_ADDRESS) {
      return { success: false, error: 'Wallet address mismatch' }
    }

    // Check sender balance
    const balanceResult = await getWalletBalance(wallet.address)
    if (balanceResult.error) {
      return { success: false, error: `Failed to check balance: ${balanceResult.error}` }
    }

    const senderBalance = parseFloat(balanceResult.balance)
    if (senderBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance: available ${senderBalance} XRP, required ${amount} XRP`
      }
    }

    // Get account info for sequence number
    console.log('[sendXRPPayment] Getting account sequence...')
    const accountInfoResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: wallet.address, ledger_index: 'validated' }]
      })
    })

    const accountInfo = await accountInfoResponse.json()
    if (accountInfo.result?.error) {
      return { success: false, error: `Failed to get account info: ${accountInfo.result.error}` }
    }

    const sequence = accountInfo.result.account_data.Sequence
    console.log('[sendXRPPayment] Account sequence:', sequence)

    // Get current fee
    console.log('[sendXRPPayment] Getting server fee...')
    const feeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'fee',
        params: [{}]
      })
    })

    const feeInfo = await feeResponse.json()
    const fee = feeInfo.result?.drops?.open_ledger_fee || '12'
    console.log('[sendXRPPayment] Fee (drops):', fee)

    // Prepare payment transaction
    const amountInDrops = xrpToDrops(amountXRP)
    const payment: {
      TransactionType: 'Payment'
      Account: string
      Destination: string
      Amount: string
      Fee: string
      Sequence: number
      DestinationTag?: number
      Memos?: Array<{ Memo: { MemoData: string } }>
    } = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: toAddress,
      Amount: amountInDrops,
      Fee: fee,
      Sequence: sequence,
    }

    if (destinationTag !== undefined) {
      payment.DestinationTag = destinationTag
    }

    if (memo) {
      const memoHex = Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
      payment.Memos = [{ Memo: { MemoData: memoHex } }]
    }

    console.log('[sendXRPPayment] Transaction prepared:', JSON.stringify(payment, null, 2))

    // Sign the transaction
    console.log('[sendXRPPayment] Signing transaction...')
    const { tx_blob, hash } = wallet.sign(payment)
    console.log('[sendXRPPayment] Transaction signed, hash:', hash)

    // Submit the transaction
    console.log('[sendXRPPayment] Submitting transaction...')
    const submitResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'submit',
        params: [{ tx_blob }]
      })
    })

    const submitResult = await submitResponse.json()
    console.log('[sendXRPPayment] Submit response:', JSON.stringify(submitResult, null, 2))

    if (submitResult.result?.error) {
      return { success: false, error: `Submit failed: ${submitResult.result.error_message || submitResult.result.error}` }
    }

    const engineResult = submitResult.result?.engine_result
    if (engineResult !== 'tesSUCCESS' && !engineResult?.startsWith('tes')) {
      return { success: false, error: `Transaction failed: ${engineResult}` }
    }

    // Poll for transaction validation (max 20 attempts, 1 second each)
    console.log('[sendXRPPayment] Polling for transaction validation...')
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const txResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tx',
          params: [{ transaction: hash, binary: false }]
        })
      })

      const txResult = await txResponse.json()
      
      if (txResult.result?.validated === true) {
        const meta = txResult.result.meta
        if (meta?.TransactionResult === 'tesSUCCESS') {
          console.log('[sendXRPPayment] ✓✓✓ Payment validated successfully! ✓✓✓')
          return {
            success: true,
            transactionHash: hash,
            ledgerIndex: txResult.result.ledger_index
          }
        } else {
          return {
            success: false,
            error: `Transaction failed: ${meta?.TransactionResult || 'Unknown error'}`
          }
        }
      }

      if (txResult.result?.error === 'txnNotFound') {
        console.log(`[sendXRPPayment] Attempt ${i + 1}/20: Transaction not yet in ledger...`)
        continue
      }

      if (txResult.result?.error) {
        return { success: false, error: `Transaction lookup failed: ${txResult.result.error}` }
      }
    }

    return { success: false, error: 'Transaction validation timeout after 20 seconds' }

  } catch (error) {
    console.error('[sendXRPPayment] ✗✗✗ Exception caught! ✗✗✗', error)
    return {
      success: false,
      error: error instanceof Error ? `Payment failed: ${error.message}` : 'Payment failed: Unknown error'
    }
  } finally {
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
