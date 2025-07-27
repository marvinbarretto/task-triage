import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../ssr/platform.service';

export interface StorageExportFormat {
  json: string;
  csv: string;
  text: string;
}

export interface StorageUsage {
  used: number;
  available: number;
  percentage: number;
}

/**
 * Generic SSR-Safe Storage Service for Angular Applications
 * 
 * Provides a comprehensive localStorage wrapper with:
 * - SSR compatibility (safe during server-side rendering)
 * - Type-safe JSON storage and retrieval
 * - Array management utilities
 * - Storage usage monitoring
 * - Export/import capabilities
 * - Error handling with graceful fallbacks
 * 
 * @example
 * // Basic string storage
 * storageService.setItem('user-preference', 'dark-mode');
 * const theme = storageService.getItem('user-preference');
 * 
 * @example
 * // Type-safe object storage
 * interface UserProfile { name: string; email: string; }
 * await storageService.setObject('profile', { name: 'John', email: 'john@example.com' });
 * const profile = await storageService.getObject<UserProfile>('profile');
 * 
 * @example
 * // Array management (perfect for recent items, history, favorites)
 * await storageService.addToArray('recent-searches', 'angular storage', 10);
 * const searches = await storageService.getArray<string>('recent-searches');
 * 
 * @example
 * // Storage usage monitoring
 * const usage = storageService.getStorageUsage();
 * console.log(`Using ${usage.percentage}% of available storage`);
 * 
 * Use Cases:
 * - User preferences and settings
 * - Shopping cart persistence
 * - Form draft auto-save
 * - Recent searches/history
 * - Offline data caching
 * - Session state management
 * - Theme and UI customizations
 * - Favorites/bookmarks
 * - Progress tracking
 * - Analytics data buffer
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private platform = inject(SsrPlatformService);

  // ========================================
  // BASIC STORAGE OPERATIONS
  // ========================================

  /**
   * Get a raw string value from localStorage
   * @param key Storage key
   * @returns String value or null if not found
   * 
   * @example
   * const theme = storageService.getItem('user-theme'); // 'dark' | 'light' | null
   */
  getItem(key: string): string | null {
    return this.platform.onlyOnBrowser(() => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`Failed to get item '${key}':`, error);
        return null;
      }
    }) || null;
  }

  /**
   * Store a raw string value in localStorage
   * @param key Storage key
   * @param value String value to store
   * 
   * @example
   * storageService.setItem('user-theme', 'dark');
   */
  setItem(key: string, value: string): void {
    this.platform.onlyOnBrowser(() => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error(`Failed to set item '${key}':`, error);
      }
    });
  }

  /**
   * Remove an item from localStorage
   * @param key Storage key to remove
   * 
   * @example
   * storageService.removeItem('user-theme');
   */
  removeItem(key: string): void {
    this.platform.onlyOnBrowser(() => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove item '${key}':`, error);
      }
    });
  }

  // ========================================
  // TYPE-SAFE JSON STORAGE
  // ========================================

  /**
   * Get a typed object from localStorage (JSON deserialized)
   * @param key Storage key
   * @returns Parsed object or null if not found
   * 
   * @example
   * interface UserSettings { theme: string; notifications: boolean; }
   * const settings = await storageService.getObject<UserSettings>('user-settings');
   * if (settings) {
   *   console.log(settings.theme); // TypeScript knows this is a string
   * }
   */
  async getObject<T>(key: string): Promise<T | null> {
    return this.platform.onlyOnBrowser(() => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        return JSON.parse(stored) as T;
      } catch (error) {
        console.error(`Failed to get object '${key}':`, error);
        return null;
      }
    }) || Promise.resolve(null);
  }

  /**
   * Store a typed object in localStorage (JSON serialized)
   * @param key Storage key
   * @param value Object to store
   * 
   * @example
   * const userProfile = { name: 'Alice', email: 'alice@example.com', age: 28 };
   * await storageService.setObject('profile', userProfile);
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to set object '${key}':`, error);
        throw new Error(`Failed to save ${key}`);
      }
    }) || Promise.resolve();
  }

  // ========================================
  // ARRAY MANAGEMENT (Perfect for lists, history, recent items)
  // ========================================

  /**
   * Get a typed array from localStorage
   * @param key Storage key
   * @returns Array of items (empty array if not found)
   * 
   * @example
   * const recentSearches = await storageService.getArray<string>('searches');
   * const cartItems = await storageService.getArray<CartItem>('shopping-cart');
   */
  async getArray<T>(key: string): Promise<T[]> {
    const stored = await this.getObject<T[]>(key);
    return stored || [];
  }

  /**
   * Add an item to the beginning of an array (most recent first)
   * @param key Storage key
   * @param item Item to add
   * @param maxItems Optional limit to prevent unlimited growth
   * 
   * @example
   * // Add to recent searches (keep only last 10)
   * await storageService.addToArray('recent-searches', 'angular tutorial', 10);
   * 
   * // Add to shopping cart
   * await storageService.addToArray('cart', { id: 123, name: 'Laptop', price: 999 });
   */
  async addToArray<T>(key: string, item: T, maxItems?: number): Promise<void> {
    const array = await this.getArray<T>(key);
    array.unshift(item);
    
    if (maxItems && array.length > maxItems) {
      array.splice(maxItems);
    }
    
    await this.setObject(key, array);
  }

  /**
   * Remove items from an array based on a condition
   * @param key Storage key
   * @param predicate Function that returns true for items to remove
   * 
   * @example
   * // Remove item from cart by ID
   * await storageService.removeFromArray('cart', item => item.id === 123);
   * 
   * // Remove old entries
   * await storageService.removeFromArray('logs', log => log.timestamp < oldDate);
   */
  async removeFromArray<T>(key: string, predicate: (item: T) => boolean): Promise<void> {
    const array = await this.getArray<T>(key);
    const filtered = array.filter(item => !predicate(item));
    await this.setObject(key, filtered);
  }

  /**
   * Update items in an array based on a condition
   * @param key Storage key
   * @param predicate Function that returns true for items to update
   * @param updater Function that transforms the item
   * 
   * @example
   * // Update cart item quantity
   * await storageService.updateInArray('cart', 
   *   item => item.id === 123, 
   *   item => ({ ...item, quantity: item.quantity + 1 })
   * );
   */
  async updateInArray<T>(key: string, predicate: (item: T) => boolean, updater: (item: T) => T): Promise<void> {
    const array = await this.getArray<T>(key);
    const updated = array.map(item => predicate(item) ? updater(item) : item);
    await this.setObject(key, updated);
  }

  // ========================================
  // STORAGE MONITORING & MAINTENANCE
  // ========================================

  /**
   * Get current localStorage usage statistics
   * @returns Usage information including percentage used
   * 
   * @example
   * const usage = storageService.getStorageUsage();
   * if (usage.percentage > 80) {
   *   console.warn('Storage almost full!');
   *   // Maybe clean up old data
   * }
   */
  getStorageUsage(): StorageUsage {
    return this.platform.onlyOnBrowser(() => {
      try {
        let used = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length;
          }
        }

        // Rough estimate of localStorage limit (usually 5-10MB)
        const available = 5 * 1024 * 1024; // 5MB
        const percentage = (used / available) * 100;

        return { used, available, percentage };
      } catch (error) {
        return { used: 0, available: 0, percentage: 0 };
      }
    }) || { used: 0, available: 0, percentage: 0 };
  }

  /**
   * Clear multiple specific items from localStorage
   * @param keys Array of keys to remove
   * 
   * @example
   * // Clear user session data
   * await storageService.clearItems(['user-token', 'user-profile', 'session-id']);
   */
  async clearItems(keys: string[]): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      keys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to remove item '${key}':`, error);
        }
      });
    }) || Promise.resolve();
  }

  /**
   * Clear ALL localStorage data (use with caution!)
   * 
   * @example
   * // Reset application state
   * await storageService.clearAllData();
   */
  async clearAllData(): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
    }) || Promise.resolve();
  }

  // ========================================
  // KEY MANAGEMENT & INSPECTION
  // ========================================

  /**
   * Get all localStorage keys, optionally filtered by prefix
   * @param prefix Optional prefix to filter keys
   * @returns Array of matching keys
   * 
   * @example
   * const allKeys = storageService.getKeys();
   * const userKeys = storageService.getKeys('user-'); // ['user-profile', 'user-settings']
   */
  getKeys(prefix?: string): string[] {
    return this.platform.onlyOnBrowser(() => {
      try {
        const keys = Object.keys(localStorage);
        return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
      } catch (error) {
        console.error('Failed to get localStorage keys:', error);
        return [];
      }
    }) || [];
  }

  /**
   * Check if a key exists in localStorage
   * @param key Storage key to check
   * @returns True if the key exists
   * 
   * @example
   * if (storageService.hasKey('user-onboarded')) {
   *   // Skip onboarding flow
   * }
   */
  hasKey(key: string): boolean {
    return this.platform.onlyOnBrowser(() => {
      try {
        return localStorage.getItem(key) !== null;
      } catch (error) {
        return false;
      }
    }) || false;
  }

  // ========================================
  // EXPORT/IMPORT UTILITIES
  // ========================================

  /**
   * Export data to JSON format (pretty-printed)
   * @param data Data to export
   * @returns JSON string
   * 
   * @example
   * const settings = await storageService.getObject('user-settings');
   * const backup = storageService.exportToJson(settings);
   * // User can save this as a backup file
   */
  exportToJson<T>(data: T): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export array data to CSV format
   * @param data Array of objects to export
   * @param headers Optional custom headers
   * @returns CSV string
   * 
   * @example
   * const cartItems = await storageService.getArray('shopping-cart');
   * const csvData = storageService.exportToCsv(cartItems, ['name', 'price', 'quantity']);
   * // User can download this as a CSV file
   */
  exportToCsv(data: Record<string, any>[], headers?: string[]): string {
    if (data.length === 0) return '';
    
    const csvHeaders = headers || Object.keys(data[0]);
    const rows = [csvHeaders.join(',')];

    data.forEach(item => {
      const row = csvHeaders.map(header => {
        const value = item[header];
        const stringValue = value != null ? String(value) : '';
        // Escape quotes and wrap in quotes if contains comma or quote
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      });
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  // ========================================
  // ADVANCED SERIALIZATION HELPERS
  // ========================================

  /**
   * Serialize complex objects for storage (handles Maps, Dates, etc.)
   * @param data Data to serialize
   * @param dateFields Array of field names that contain Date objects
   * @returns Serializable object
   * 
   * @example
   * const sessionData = {
   *   id: '123',
   *   createdAt: new Date(),
   *   metadata: new Map([['key', 'value']])
   * };
   * const serialized = storageService.serializeForStorage(sessionData, ['createdAt']);
   */
  protected serializeForStorage<T>(data: T, dateFields: string[] = []): any {
    const serialized = JSON.parse(JSON.stringify(data));
    
    // Convert Maps to arrays for JSON storage
    for (const key in serialized) {
      if (serialized[key] instanceof Map) {
        serialized[key] = Array.from(serialized[key].entries());
      }
    }

    return serialized;
  }

  /**
   * Deserialize complex objects from storage (restores Maps, Dates, etc.)
   * @param data Stored data to deserialize
   * @param dateFields Array of field names that should be Date objects
   * @param mapFields Array of field names that should be Map objects
   * @returns Restored object
   * 
   * @example
   * const restored = storageService.deserializeFromStorage(
   *   storedData, 
   *   ['createdAt', 'updatedAt'], 
   *   ['metadata']
   * );
   */
  protected deserializeFromStorage<T>(data: any, dateFields: string[] = [], mapFields: string[] = []): T {
    const result = { ...data };

    // Convert date strings back to Date objects
    dateFields.forEach(field => {
      if (result[field]) {
        result[field] = new Date(result[field]);
      }
    });

    // Convert arrays back to Maps
    mapFields.forEach(field => {
      if (result[field] && Array.isArray(result[field])) {
        result[field] = new Map(result[field]);
      }
    });

    return result as T;
  }
}