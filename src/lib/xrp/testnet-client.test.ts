/**
 * Test script for XRP Testnet Client
 * 
 * This script demonstrates and tests the functionality of the testnet-client module.
 * Run with: npx tsx --env-file=.env src/lib/xrp/testnet-client.test.ts
 */

import {
  validateWalletAddress,
  getWalletBalance,
  connectToTestnet,
  disconnectFromTestnet,
} from './testnet-client'

async function runTests() {
  console.log('=== XRP Testnet Client Tests ===\n')

  // Test 1: Validate wallet address
  console.log('Test 1: Wallet Address Validation')
  console.log('Valid address (rseeYoscYadZhQfsGTjL95wdxQHWuCyzgR):', 
    validateWalletAddress('rseeYoscYadZhQfsGTjL95wdxQHWuCyzgR'))
  console.log('Invalid address (invalid_address):', 
    validateWalletAddress('invalid_address'))
  console.log('Invalid address (empty string):', 
    validateWalletAddress(''))
  console.log()

  // Test 2: Connect to Testnet
  console.log('Test 2: Connect to XRP Testnet')
  try {
    const client = await connectToTestnet()
    console.log('✅ Successfully connected to XRP Testnet')
    console.log('Is connected:', client.isConnected())
    await disconnectFromTestnet(client)
    console.log('✅ Successfully disconnected from XRP Testnet')
  } catch (error) {
    console.error('❌ Connection failed:', error instanceof Error ? error.message : error)
  }
  console.log()

  // Test 3: Get wallet balance
  console.log('Test 3: Get Wallet Balance')
  const testAddress = process.env.XRP_TESTNET_WALLET_ADDRESS || 'rseeYoscYadZhQfsGTjL95wdxQHWuCyzgR'
  try {
    const balanceResult = await getWalletBalance(testAddress)
    if (balanceResult.error) {
      console.log('⚠️  Balance retrieval returned an error:', balanceResult.error)
    } else {
      console.log(`✅ Balance for ${testAddress}:`, balanceResult.balance, 'XRP')
    }
  } catch (error) {
    console.error('❌ Balance retrieval failed:', error instanceof Error ? error.message : error)
  }
  console.log()

  // Test 4: Validate invalid address balance
  console.log('Test 4: Get Balance for Invalid Address')
  try {
    const invalidResult = await getWalletBalance('invalid_address')
    console.log('Result:', invalidResult)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
  console.log()

  console.log('=== Tests Complete ===')
}

// Run tests
runTests().catch(console.error)
