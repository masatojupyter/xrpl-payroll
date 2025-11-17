/**
 * Manual Test Script for XRP Testnet Client
 * 
 * Run with: npx tsx --env-file=.env src/lib/xrp/manual-test.ts
 */

import { 
  connectToTestnet, 
  getWalletBalance,
  disconnectFromTestnet,
  validateWalletAddress
} from './testnet-client'

async function manualTest() {
  console.log('=== XRP Testnet Manual Test ===\n')

  // Test wallet address
  const testWallet = 'rMg2AK7e3FXLXUhgvt69JuzG25Q88JxAtD'
  
  console.log('Testing wallet address:', testWallet)
  console.log('Is valid address:', validateWalletAddress(testWallet))
  console.log()

  // Test connection
  console.log('Connecting to XRP Testnet...')
  const client = await connectToTestnet()
  console.log('✅ Connected successfully')
  console.log('Connection status:', client.isConnected())
  console.log()

  // Test balance retrieval
  console.log('Fetching wallet balance...')
  const balance = await getWalletBalance(testWallet)
  console.log('Balance result:', balance)
  
  if (balance.error) {
    console.log('⚠️  Error:', balance.error)
  } else {
    console.log(`✅ Balance: ${balance.balance} XRP`)
  }
  console.log()

  // Disconnect
  console.log('Disconnecting...')
  await disconnectFromTestnet(client)
  console.log('✅ Disconnected')
  console.log()

  console.log('=== Manual Test Complete ===')
}

// Run the manual test
manualTest().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
