// In-memory cache with TTL (Time-To-Live) support

import { CacheEntry, CacheStatus } from './types';

class CacheManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt,
    });
  }

  /**
   * Get a value from the cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get cache status for a key
   */
  getStatus(key: string): CacheStatus {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { isCached: false };
    }

    const now = Date.now();
    const isExpired = now > entry.expiresAt;

    if (isExpired) {
      this.cache.delete(key);
      return { isCached: false };
    }

    return {
      isCached: true,
      lastUpdated: new Date(entry.timestamp).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      age: now - entry.timestamp,
    };
  }

  /**
   * Force clear a specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Export singleton instance
export const cache = new CacheManager();
