// services/cacheService.ts
// Simple in-memory cache with TTL support

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

  // Set data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };
    this.cache.set(key, item);
  }

  // Get data from cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // Check if data exists and is not expired
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Clear specific cache item
  clear(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
  }

  // Clear expired items
  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const cacheService = new CacheService();

// Helper function to create cache keys
export const createCacheKey = (endpoint: string, params?: any): string => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${endpoint}${paramString}`;
};

// Higher-order function for API caching
export const withCache = async <T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Try to get from cache first
  const cached = cacheService.get<T>(key);
  if (cached) {
    console.log(`🎯 Cache hit for: ${key}`);
    return cached;
  }

  // If not in cache, make API call
  console.log(`🔄 Cache miss for: ${key}`);
  try {
    const result = await apiCall();
    cacheService.set(key, result, ttl);
    return result;
  } catch (error) {
    console.error(`❌ API error for: ${key}`, error);
    throw error;
  }
};
