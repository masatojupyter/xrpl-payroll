/**
 * XRP/USD Exchange Rate API
 * Fetches real-time exchange rate with caching and fallback
 */

import { NextResponse } from 'next/server';
import { withCache, CACHE_CONFIGS } from '@/lib/cache';

// Types
type ExchangeRateResponse = {
  success: true;
  rate: number;
  currency: string;
  timestamp: string;
  source: string;
};

type ErrorResponse = {
  success: false;
  error: string;
};

// Constants
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd';
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT';
const TIMEOUT_MS = 10000; // 10 seconds
const CACHE_KEY = 'xrp-exchange-rate';

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch rate from CoinGecko
 */
async function fetchFromCoinGecko(): Promise<{ rate: number; source: string }> {
  const response = await fetchWithTimeout(COINGECKO_API, TIMEOUT_MS);
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.ripple || typeof data.ripple.usd !== 'number') {
    throw new Error('Invalid response format from CoinGecko');
  }

  return {
    rate: data.ripple.usd,
    source: 'coingecko',
  };
}

/**
 * Fetch rate from Binance (fallback)
 */
async function fetchFromBinance(): Promise<{ rate: number; source: string }> {
  const response = await fetchWithTimeout(BINANCE_API, TIMEOUT_MS);
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.price || typeof data.price !== 'string') {
    throw new Error('Invalid response format from Binance');
  }

  const rate = parseFloat(data.price);
  if (isNaN(rate)) {
    throw new Error('Invalid price value from Binance');
  }

  return {
    rate,
    source: 'binance',
  };
}

/**
 * Fetch exchange rate with fallback
 */
async function fetchExchangeRate(): Promise<{ rate: number; source: string }> {
  // Try CoinGecko first
  try {
    return await fetchFromCoinGecko();
  } catch (coinGeckoError) {
    console.warn('CoinGecko API failed, trying Binance:', coinGeckoError);

    // Fallback to Binance
    try {
      return await fetchFromBinance();
    } catch (binanceError) {
      console.error('Binance API also failed:', binanceError);
      throw new Error('Failed to fetch exchange rate from all sources');
    }
  }
}

/**
 * GET /api/xrp/exchange-rate
 * Get current XRP/USD exchange rate
 */
export async function GET(): Promise<NextResponse<ExchangeRateResponse | ErrorResponse>> {
  try {
    // Fetch with caching (5 minutes)
    const result = await withCache(
      CACHE_KEY,
      fetchExchangeRate,
      CACHE_CONFIGS.SHORT // 5 minutes TTL
    );

    const response: ExchangeRateResponse = {
      success: true,
      rate: result.rate,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: result.source,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Exchange rate API error:', error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exchange rate',
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
