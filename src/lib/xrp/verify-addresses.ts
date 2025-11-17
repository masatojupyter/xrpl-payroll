/**
 * Address Verification Script
 * 
 * Tests multiple wallet addresses to verify validation
 * Run with: npx tsx --env-file=.env src/lib/xrp/verify-addresses.ts
 */

import { 
  getWalletBalance,
  validateWalletAddress
} from './testnet-client'

async function verifyAddresses() {
  console.log('=== XRP Address Verification ===\n')

  const testAddresses = [
    'rseeYoscYadZhQfsGTjL95wdxQHWuCyzgR', // From .env - known working
    'rMg2AK7e3FXLXUhgvt69JuzG25Q88JxAtD', // User's test address
    'rPCcbpMWLamKuwcMvzKrmSSoEUChW7pZt2', // Common testnet address
  ]

  for (const address of testAddresses) {
    console.log(`\nTesting: ${address}`)
    console.log('Format validation:', validateWalletAddress(address) ? '✅ Valid' : '❌ Invalid')
    
    try {
      const balance = await getWalletBalance(address)
      
      if (balance.error) {
        console.log('Balance check:', `⚠️  ${balance.error}`)
      } else {
        console.log('Balance check:', `✅ ${balance.balance} XRP`)
      }
    } catch (error) {
      console.log('Balance check:', `❌ ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log('\n=== Verification Complete ===')
}

verifyAddresses().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
