/**
 * Cache utility for API responses
 * Provides reusable cache configuration and headers
 */

export type CacheConfig = {
  // Time-to-live in seconds
  ttl: number;
  // Stale-while-revalidate duration in seconds (optional)
  staleWhileRevalidate?: number;
  // Cache tags for invalidation (optional)
  tags?: readonly string[];
};

export const CACHE_CONFIGS = {
  // Short-lived cache for frequently changing data (5 minutes)
  SHORT: {
    ttl: 5 * 60,
    staleWhileRevalidate: 60,
  },
  // Medium-lived cache for moderately changing data (15 minutes)
  MEDIUM: {
    ttl: 15 * 60,
    staleWhileRevalidate: 5 * 60,
  },
  // Long-lived cache for rarely changing data (1 hour)
  LONG: {
    ttl: 60 * 60,
    staleWhileRevalidate: 10 * 60,
  },
  // Dashboard stats: frequently accessed, acceptable to be slightly stale
  DASHBOARD_STATS: {
    ttl: 5 * 60,
    staleWhileRevalidate: 2 * 60,
    tags: ['dashboard', 'stats'],
  },
  // Dashboard charts: less critical, can be cached longer
  DASHBOARD_CHARTS: {
    ttl: 10 * 60,
    staleWhileRevalidate: 5 * 60,
    tags: ['dashboard', 'charts'],
  },
} as const;

/**
 * Generate cache control headers based on configuration
 */
export function getCacheHeaders(config: CacheConfig): HeadersInit {
  const directives: string[] = [
    `s-maxage=${config.ttl}`,
    'public',
  ];

  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Get cache key for organization-specific data
 */
export function getOrgCacheKey(organizationId: string, prefix: string): string {
  return `${prefix}:org:${organizationId}`;
}

/**
 * Cache invalidation helper (for future use with Redis/KV store)
 */
export type CacheInvalidation = {
  // Patterns to match cache keys for invalidation
  patterns?: string[];
  // Specific cache tags to invalidate
  tags?: string[];
};

/**
 * Create cache key with timestamp for versioning
 */
export function getVersionedCacheKey(
  baseKey: string,
  timestamp: Date = new Date()
): string {
  // Round to nearest minute for better cache hit rate
  const roundedTime = new Date(
    Math.floor(timestamp.getTime() / (60 * 1000)) * 60 * 1000
  );
  return `${baseKey}:${roundedTime.getTime()}`;
}

/**
 * In-memory cache for development (should be replaced with Redis in production)
 */
class MemoryCache {
  private cache = new Map<string, { data: unknown; expires: number }>();

  set(key: string, data: unknown, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expires });

    // Auto cleanup expired entries
    setTimeout(() => {
      this.cache.delete(key);
    }, ttlSeconds * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get all keys matching a pattern
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  // Invalidate by pattern
  invalidateByPattern(pattern: string): void {
    const keys = this.getKeysByPattern(pattern);
    keys.forEach((key) => this.cache.delete(key));
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache();

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<T> {
  // Try to get from cache
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  memoryCache.set(key, data, config.ttl);

  return data;
}
