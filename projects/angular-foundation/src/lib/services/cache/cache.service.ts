import { inject, Injectable } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Centralized TTL (Time To Live) constants for caching strategy
 *
 * USAGE:
 * - STATIC_* for data that rarely changes (reference data, system config)
 * - COMPETITIVE for real-time data that affects multiple users (leaderboards)
 * - PERSONAL for user-scoped data (user's own data, preferences)
 * - NO_CACHE to disable caching entirely
 */
export const CACHE_TTL = {
  // Static data - changes very rarely
  STATIC_VERY_LONG: 7 * 24 * 60 * 60 * 1000,  // 7 days (system config, app constants)
  STATIC_LONG: 24 * 60 * 60 * 1000,           // 24 hours (reference data, definitions)
  STATIC_MEDIUM: 60 * 60 * 1000,              // 1 hour (static reference data)
  STATIC_SHORT: 15 * 60 * 1000,               // 15 minutes (semi-static data)

  // Dynamic competitive data - needs to be fresh for real-time experience
  COMPETITIVE: 30 * 1000,                     // 30 seconds (leaderboards, global stats)

  // User personal data - can cache longer since user controls changes
  PERSONAL: 5 * 60 * 1000,                    // 5 minutes (user's own data)

  // Development/testing
  DEVELOPMENT: 10 * 1000,                     // 10 seconds (for testing cache behavior)
  NO_CACHE: 0                                 // Disable caching entirely
} as const;

/**
 * Configuration options for cache operations
 */
export interface CacheOptions<T> {
  key: string;                    // Unique cache key
  ttlMs: number;                  // Time to live in milliseconds
  loadFresh: () => Promise<T[]>;  // Function to load fresh data
  userId?: string;                // Optional user context for user-scoped caching
}

/**
 * Cache entry structure stored in localStorage
 */
export interface CacheEntry<T> {
  timestamp: number;  // When the data was cached
  data: T[];         // The cached data
}

/**
 * Cache information for debugging and monitoring
 */
export interface CacheInfo {
  key: string;    // Cache key
  size: number;   // Number of items in cache
  age: number;    // Age in seconds
}

/**
 * Generic caching service with TTL (Time To Live) support and user-scoped caching.
 *
 * This service provides a robust caching layer for any application that needs to cache
 * data with automatic expiration and user context support.
 *
 * Features:
 * - TTL-based cache expiration
 * - User-scoped caching (optional userId parameter)
 * - SSR-safe implementation using SsrPlatformService
 * - Comprehensive cache management (clear, clearAll, etc.)
 * - Debug utilities for cache monitoring
 * - Automatic cache cleanup on errors
 *
 * Use cases:
 * - API response caching
 * - User preference caching
 * - Static data caching (reference data, configs)
 * - Real-time data with appropriate TTL
 *
 * Example usage:
 * ```typescript
 * const cacheService = inject(CacheService);
 *
 * // Cache API data for 1 hour
 * const data = await cacheService.load({
 *   key: 'api-users',
 *   ttlMs: CACHE_TTL.STATIC_MEDIUM,
 *   loadFresh: () => this.api.getUsers()
 * });
 *
 * // Cache user-specific data
 * const userData = await cacheService.load({
 *   key: 'user-preferences',
 *   ttlMs: CACHE_TTL.PERSONAL,
 *   loadFresh: () => this.api.getUserPreferences(),
 *   userId: currentUser.id
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly platform = inject(SsrPlatformService);

  /**
   * Load data from cache or fetch fresh if expired/missing
   */
  async load<T>({
    key,
    ttlMs,
    loadFresh,
    userId,
  }: CacheOptions<T>): Promise<T[]> {
    // Create user-specific cache key if userId provided
    const cacheKey = userId ? `${key}:${userId}` : key;
    const now = Date.now();

    // Try reading from cache (browser only)
    const raw = this.platform.onlyOnBrowser(() => localStorage.getItem(cacheKey));
    if (raw) {
      try {
        const { timestamp, data } = JSON.parse(raw) as CacheEntry<T>;
        const age = now - timestamp;
        if (age < ttlMs) {
          console.log(
            `[Cache] ⚡ Loaded ${data.length} items from cache (${key}, ${Math.round(
              age / 1000,
            )}s old)`,
          );
          return data;
        } else {
          console.log(`[Cache] ⏰ Cache expired for ${key} — fetching fresh data`);
        }
      } catch (e) {
        console.warn(`[Cache] 🧨 Failed to parse cache for ${key}:`, e);
      }
    } else {
      console.log(`[Cache] 📭 No cache for ${key} — fetching from source`);
    }

    // Load fresh data
    const fresh = await loadFresh();

    // Write back to cache (browser only)
    this.platform.onlyOnBrowser(() => {
      try {
        const cacheEntry: CacheEntry<T> = { timestamp: now, data: fresh };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        console.log(
          `[Cache] 🧊 Stored ${fresh.length} items to cache (${key})`,
        );
      } catch (e) {
        console.warn(`[Cache] ⚠️ Failed to write cache for ${key}:`, e);
      }
    });

    return fresh;
  }

  /**
   * Clear cache for a specific key
   */
  clear(key: string, userId?: string): void {
    const cacheKey = userId ? `${key}:${userId}` : key;
    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem(cacheKey);
      console.log(`[Cache] 🧽 Cleared cache for ${key}${userId ? ` (user: ${userId})` : ''}`);
    });
  }

  /**
   * Clear all caches for a specific user
   */
  clearUserCaches(userId: string): void {
    this.platform.onlyOnBrowser(() => {
      const keysToRemove: string[] = [];

      // Find all keys that end with this userId
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`:${userId}`)) {
          keysToRemove.push(key);
        }
      }

      // Remove them
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        const baseKey = key.replace(`:${userId}`, '');
        console.log(`[Cache] 🧽 Cleared user cache for ${baseKey} (user: ${userId})`);
      });
    });
  }

  /**
   * Clear all caches (use sparingly)
   */
  clearAll(): void {
    this.platform.onlyOnBrowser(() => {
      localStorage.clear();
      console.log(`[Cache] 🧹 Cleared all caches`);
    });
  }

  /**
   * Get cache information for debugging and monitoring
   */
  getCacheInfo(): CacheInfo[] {
    return this.platform.onlyOnBrowser(() => {
      const info: CacheInfo[] = [];
      const now = Date.now();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value) as CacheEntry<any>;
              if (parsed.timestamp && parsed.data) {
                info.push({
                  key,
                  size: parsed.data.length,
                  age: Math.round((now - parsed.timestamp) / 1000)
                });
              }
            } catch {
              // Not a cache entry, skip
            }
          }
        }
      }

      return info;
    }) || [];
  }

  /**
   * Check if a cache key exists and is not expired
   */
  isCached(key: string, ttlMs: number, userId?: string): boolean {
    const cacheKey = userId ? `${key}:${userId}` : key;

    return this.platform.onlyOnBrowser(() => {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return false;

      try {
        const { timestamp } = JSON.parse(raw) as CacheEntry<any>;
        const age = Date.now() - timestamp;
        return age < ttlMs;
      } catch {
        return false;
      }
    }) || false;
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getCacheSize(): number {
    return this.platform.onlyOnBrowser(() => {
      let totalSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.timestamp && parsed.data) {
                // Approximate size: key + value as string
                totalSize += key.length + value.length;
              }
            } catch {
              // Not a cache entry, skip
            }
          }
        }
      }

      return totalSize;
    }) || 0;
  }
}
