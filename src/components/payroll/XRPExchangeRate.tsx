'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { TrendingUp, RefreshCw, AlertCircle, Clock, Database } from 'lucide-react'
import { format } from 'date-fns'

interface ExchangeRateResponse {
  success: boolean
  rate: number
  currency: string
  timestamp: string
  source: string
  error?: string
}

interface XRPExchangeRateProps {
  showCalculator?: boolean
  className?: string
}

const fetcher = async (url: string): Promise<ExchangeRateResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch exchange rate')
  }
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch exchange rate')
  }
  return data
}

export function XRPExchangeRate({ 
  showCalculator = false, 
  className = '' 
}: XRPExchangeRateProps) {
  const [usdAmount, setUsdAmount] = useState<string>('')
  const [xrpAmount, setXrpAmount] = useState<string>('')

  // Fetch exchange rate with 5-minute auto-refresh
  const { data, error, isLoading, isValidating } = useSWR<ExchangeRateResponse>(
    '/api/xrp/exchange-rate',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Calculate XRP amount when USD amount or rate changes
  useEffect(() => {
    if (data?.rate && usdAmount) {
      const usd = parseFloat(usdAmount)
      if (!isNaN(usd) && usd > 0) {
        const xrp = usd / data.rate
        setXrpAmount(xrp.toFixed(6))
      } else {
        setXrpAmount('')
      }
    } else {
      setXrpAmount('')
    }
  }, [usdAmount, data?.rate])

  const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUsdAmount(value)
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'coingecko':
        return <TrendingUp className="w-4 h-4" />
      case 'binance':
        return <TrendingUp className="w-4 h-4" />
      case 'cache':
        return <Database className="w-4 h-4" />
      default:
        return null
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'coingecko':
        return 'CoinGecko'
      case 'binance':
        return 'Binance'
      default:
        return source.charAt(0).toUpperCase() + source.slice(1)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return format(date, 'yyyy/MM/dd HH:mm:ss')
    } catch {
      return timestamp
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              XRP/USD Exchange Rate
            </h3>
          </div>
          {isValidating && !isLoading && (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading exchange rate...</p>
          </div>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Failed to load exchange rate
            </p>
            <p className="text-xs text-gray-500 text-center">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        ) : data ? (
          // Data Display
          <>
            {/* Rate Display */}
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${data.rate.toFixed(4)}
              </div>
              <p className="text-sm text-gray-500">per XRP</p>
            </div>

            {/* Metadata */}
            <div className="space-y-2 mb-4">
              {/* Source */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Source:</span>
                <div className="flex items-center gap-1 text-gray-700">
                  {getSourceIcon(data.source)}
                  <span className="font-medium">
                    {getSourceLabel(data.source)}
                  </span>
                </div>
              </div>

              {/* Last Update */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Last Updated:</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(data.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Calculator */}
            {showCalculator && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">
                  USD to XRP Calculator
                </h4>
                <div className="space-y-3">
                  {/* USD Input */}
                  <div>
                    <label 
                      htmlFor="usd-amount" 
                      className="block text-xs text-gray-600 mb-1"
                    >
                      USD Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        $
                      </span>
                      <input
                        id="usd-amount"
                        type="text"
                        value={usdAmount}
                        onChange={handleUsdChange}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* XRP Output */}
                  <div>
                    <label 
                      htmlFor="xrp-amount" 
                      className="block text-xs text-gray-600 mb-1"
                    >
                      XRP Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        XRP
                      </span>
                      <input
                        id="xrp-amount"
                        type="text"
                        value={xrpAmount}
                        readOnly
                        placeholder="0.000000"
                        className="w-full pl-12 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-900 cursor-default"
                      />
                    </div>
                  </div>

                  {/* Conversion Info */}
                  {xrpAmount && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      1 XRP = ${data.rate.toFixed(4)} USD
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Auto-refresh Notice */}
      {!isLoading && !error && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            Auto-refreshes every 5 minutes
          </p>
        </div>
      )}
    </div>
  )
}
