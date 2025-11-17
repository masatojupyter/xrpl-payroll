/**
 * Test page for XRP Exchange Rate Component
 * Navigate to /test-xrp-rate to view
 */

import { XRPExchangeRate } from '@/components/payroll/XRPExchangeRate'

export default function TestXRPRatePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          XRP Exchange Rate Component Test
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Display */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Basic Display (No Calculator)
            </h2>
            <XRPExchangeRate />
          </div>

          {/* With Calculator */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              With Calculator
            </h2>
            <XRPExchangeRate showCalculator={true} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Test Instructions
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Verify the exchange rate is displayed correctly</li>
            <li>• Check that the source (CoinGecko/Binance) is shown</li>
            <li>• Confirm the last updated timestamp is displayed</li>
            <li>• Test the calculator: enter USD amount and verify XRP conversion</li>
            <li>• Watch for the refresh indicator after 5 minutes</li>
            <li>• Check error handling by disabling network in dev tools</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
