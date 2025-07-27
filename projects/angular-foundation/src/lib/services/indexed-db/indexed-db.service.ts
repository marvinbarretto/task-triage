import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Configuration for an IndexedDB object store
 */
export interface StoreConfig {
  name: string;                    // Store name
  keyPath?: string;               // Optional key path for inline keys
  autoIncrement?: boolean;        // Auto-increment keys
  indexes?: IndexConfig[];        // Optional indexes to create
}

/**
 * Configuration for an IndexedDB index
 */
export interface IndexConfig {
  name: string;                   // Index name
  keyPath: string | string[];     // Key path(s) for the index
  unique?: boolean;               // Whether the index should be unique
  multiEntry?: boolean;           // Whether the index supports arrays
}

/**
 * Configuration for an IndexedDB database
 */
export interface DatabaseConfig {
  name: string;                   // Database name
  version: number;                // Database version
  stores: StoreConfig[];          // Object stores to create
}

/**
 * Types of database operations for metrics tracking
 */
export type DbOperation = 'read' | 'write' | 'delete' | 'clear';

/**
 * Performance metrics for database operations
 */
export interface DbMetrics {
  operations: Record<DbOperation, number>;
  totalSize: number;
  lastUpdated: number;
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    operations: Array<{
      type: DbOperation;
      duration: number;
      timestamp: number;
      dbName: string;
      storeName: string;
      collection?: string;
      tier?: string;
    }>;
  };
  collections: {
    [collection: string]: {
      operations: number;
      avgLatency: number;
      totalSize: number;
      tier?: string;
      lastAccessed: number;
    };
  };
}

/**
 * Storage usage estimate from navigator.storage.estimate()
 */
export interface StorageEstimate {
  usage?: number;     // Bytes used
  quota?: number;     // Bytes available
  percentage?: number; // Usage percentage
}

/**
 * Options for querying data with cursor
 */
export interface QueryOptions {
  direction?: IDBCursorDirection;  // Cursor direction
  limit?: number;                  // Maximum results to return
  offset?: number;                 // Number of results to skip
}

/**
 * Generic IndexedDB service with comprehensive features and SSR safety.
 *
 * This service provides a complete IndexedDB wrapper for any Angular application
 * that needs robust client-side database functionality with performance monitoring.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Comprehensive CRUD operations (Create, Read, Update, Delete)
 * - Advanced querying with indexes and cursors
 * - Performance metrics and monitoring
 * - Collection-based organization for better analytics
 * - Automatic transaction management
 * - Storage quota monitoring
 * - Detailed error handling and logging
 * - Database versioning and migration support
 * - Batch operations for better performance
 *
 * Use cases:
 * - Offline-first applications with local data storage
 * - Caching large datasets and media files
 * - User-generated content and document storage
 * - Progressive Web App (PWA) data persistence
 * - Analytics and metrics collection
 * - File uploads and media management
 * - Shopping cart and user preferences
 *
 * Example usage:
 * ```typescript
 * const indexedDb = inject(IndexedDbService);
 *
 * // Setup database
 * const config: DatabaseConfig = {
 *   name: 'MyAppDB',
 *   version: 1,
 *   stores: [
 *     {
 *       name: 'users',
 *       keyPath: 'id',
 *       indexes: [
 *         { name: 'email', keyPath: 'email', unique: true },
 *         { name: 'status', keyPath: 'status' }
 *       ]
 *     },
 *     { name: 'files', keyPath: 'id' }
 *   ]
 * };
 *
 * await indexedDb.openDatabase(config);
 *
 * // Store data
 * await indexedDb.put('MyAppDB', 'users', { id: 1, name: 'John', email: 'john@example.com' });
 *
 * // Query data
 * const user = await indexedDb.get('MyAppDB', 'users', 1);
 * const activeUsers = await indexedDb.getByIndex('MyAppDB', 'users', 'status', 'active');
 *
 * // Monitor performance
 * const metrics = indexedDb.getMetrics();
 * console.log(`Average read time: ${metrics.performance.avgReadTime}ms`);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private readonly platform = inject(SsrPlatformService);
  private databases = new Map<string, IDBDatabase>();
  private metrics: DbMetrics = {
    operations: { read: 0, write: 0, delete: 0, clear: 0 },
    totalSize: 0,
    lastUpdated: Date.now(),
    performance: {
      avgReadTime: 0,
      avgWriteTime: 0,
      operations: []
    },
    collections: {}
  };
  private readonly MAX_PERFORMANCE_LOGS = 1000;

  /**
   * Check if IndexedDB is supported in current environment
   */
  isSupported(): boolean {
    return this.platform.onlyOnBrowser(() => 'indexedDB' in window) || false;
  }

  /**
   * Open or create a database with specified configuration
   */
  async openDatabase(config: DatabaseConfig): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    console.log(`🔧 [IndexedDB] === OPENING DATABASE ===`);
    console.log(`🔧 [IndexedDB] Database: ${config.name} v${config.version}`);
    console.log(`🔧 [IndexedDB] Stores: ${config.stores.map(s => s.name).join(', ')}`);

    // Check if already open
    const existing = this.databases.get(config.name);
    if (existing && existing.version >= config.version) {
      console.log(`✅ [IndexedDB] Database already open: ${config.name} v${existing.version}`);
      return existing;
    }

    return this.platform.onlyOnBrowser(async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        console.log(`⏳ [IndexedDB] Requesting database open: ${config.name}`);
        const request = indexedDB.open(config.name, config.version);

        request.onupgradeneeded = (event) => {
          console.log(`🔄 [IndexedDB] === UPGRADE NEEDED ===`);
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = (event as any).oldVersion;

          console.log(`🔄 [IndexedDB] Upgrading ${config.name} from v${oldVersion} to v${config.version}`);
          console.log(`🔄 [IndexedDB] Existing stores: [${Array.from(db.objectStoreNames).join(', ')}]`);

          // Create stores that don't exist
          for (const storeConfig of config.stores) {
            if (!db.objectStoreNames.contains(storeConfig.name)) {
              console.log(`🆕 [IndexedDB] Creating store: ${storeConfig.name}`);

              const storeOptions: IDBObjectStoreParameters = {};
              if (storeConfig.keyPath) {
                storeOptions.keyPath = storeConfig.keyPath;
              }
              if (storeConfig.autoIncrement) {
                storeOptions.autoIncrement = storeConfig.autoIncrement;
              }

              const store = db.createObjectStore(storeConfig.name, storeOptions);

              // Create indexes if specified
              if (storeConfig.indexes) {
                for (const index of storeConfig.indexes) {
                  console.log(`📇 [IndexedDB] Creating index: ${index.name} on ${index.keyPath}`);
                  store.createIndex(index.name, index.keyPath, {
                    unique: index.unique,
                    multiEntry: index.multiEntry
                  });
                }
              }
              console.log(`✅ [IndexedDB] Store created: ${storeConfig.name}`);
            } else {
              console.log(`ℹ️ [IndexedDB] Store already exists: ${storeConfig.name}`);
            }
          }
          console.log(`🔄 [IndexedDB] === UPGRADE COMPLETE ===`);
        };

        request.onsuccess = () => {
          const db = request.result;
          this.databases.set(config.name, db);
          console.log(`✅ [IndexedDB] === DATABASE OPENED SUCCESSFULLY ===`);
          console.log(`✅ [IndexedDB] Database: ${config.name} v${db.version}`);
          console.log(`✅ [IndexedDB] Available stores: [${Array.from(db.objectStoreNames).join(', ')}]`);
          resolve(db);
        };

        request.onerror = () => {
          console.error(`❌ [IndexedDB] === DATABASE OPEN FAILED ===`);
          console.error(`❌ [IndexedDB] Database: ${config.name}`);
          console.error(`❌ [IndexedDB] Error:`, request.error);
          reject(request.error);
        };

        request.onblocked = () => {
          console.warn(`⚠️ [IndexedDB] Database open blocked: ${config.name} (another tab may be using an older version)`);
        };
      });
    }) || Promise.reject(new Error('IndexedDB not available'));
  }

  /**
   * Store data in IndexedDB
   */
  async put<T>(
    dbName: string,
    storeName: string,
    data: T,
    key?: IDBValidKey
  ): Promise<IDBValidKey> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    const startTime = performance.now();
    console.log(`💾 [IndexedDB] === PUT OPERATION STARTED ===`);
    console.log(`💾 [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`💾 [IndexedDB] Key: ${key || 'auto-generated'}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');

      transaction.onabort = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] Transaction aborted after ${duration.toFixed(1)}ms`);
        reject(transaction.error);
      };

      const store = transaction.objectStore(storeName);
      const request = key ? store.put(data, key) : store.put(data);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const resultKey = request.result;

        console.log(`✅ [IndexedDB] === PUT OPERATION SUCCESS ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Result key: ${resultKey}`);

        const collection = key ? this.extractCollectionFromKey(key) : undefined;
        this.recordOperation('write', duration, dbName, storeName, collection);

        resolve(resultKey);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === PUT OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get data from IndexedDB
   */
  async get<T>(
    dbName: string,
    storeName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    if (!this.isSupported()) {
      return undefined;
    }

    const startTime = performance.now();
    console.log(`🔍 [IndexedDB] === GET OPERATION STARTED ===`);
    console.log(`🔍 [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`🔍 [IndexedDB] Key: ${key}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const result = request.result as T | undefined;

        console.log(`✅ [IndexedDB] === GET OPERATION COMPLETE ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Result: ${result ? 'found' : 'not found'}`);

        const collection = this.extractCollectionFromKey(key);
        this.recordOperation('read', duration, dbName, storeName, collection);

        resolve(result);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === GET OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(
    dbName: string,
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<T[]> {
    if (!this.isSupported()) {
      return [];
    }

    const startTime = performance.now();
    console.log(`📋 [IndexedDB] === GET ALL OPERATION STARTED ===`);
    console.log(`📋 [IndexedDB] Target: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll(query, count);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const results = request.result;

        console.log(`✅ [IndexedDB] === GET ALL OPERATION COMPLETE ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Items retrieved: ${results.length}`);

        this.recordOperation('read', duration, dbName, storeName);
        resolve(results);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === GET ALL OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all keys from a store
   */
  async getAllKeys(
    dbName: string,
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<IDBValidKey[]> {
    if (!this.isSupported()) {
      return [];
    }

    console.log(`🔑 [IndexedDB] Getting all keys from: ${dbName}/${storeName}`);
    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys(query, count);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Retrieved ${request.result.length} keys`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Failed to get all keys:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Query items by index
   */
  async getByIndex<T>(
    dbName: string,
    storeName: string,
    indexName: string,
    value: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<T[]> {
    if (!this.isSupported()) {
      return [];
    }

    console.log(`🔍 [IndexedDB] === QUERY BY INDEX ===`);
    console.log(`🔍 [IndexedDB] Target: ${dbName}/${storeName}/${indexName}`);
    console.log(`🔍 [IndexedDB] Value: ${value}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value, count);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Found ${request.result.length} items by index`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Failed to query by index:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(
    dbName: string,
    storeName: string,
    key: IDBValidKey | IDBKeyRange
  ): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    const startTime = performance.now();
    console.log(`🗑️ [IndexedDB] === DELETE OPERATION STARTED ===`);
    console.log(`🗑️ [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`🗑️ [IndexedDB] Key: ${key}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] Delete successful: ${key}`);

        const collection = typeof key === 'string' ? this.extractCollectionFromKey(key) : undefined;
        this.recordOperation('delete', duration, dbName, storeName, collection);

        resolve();
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Delete failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(dbName: string, storeName: string): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    const startTime = performance.now();
    console.log(`🧹 [IndexedDB] === CLEAR OPERATION STARTED ===`);
    console.log(`🧹 [IndexedDB] Target: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] Store cleared: ${storeName}`);

        this.recordOperation('clear', duration, dbName, storeName);
        resolve();
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Clear failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Count items in a store
   */
  async count(
    dbName: string,
    storeName: string,
    query?: IDBValidKey | IDBKeyRange
  ): Promise<number> {
    if (!this.isSupported()) {
      return 0;
    }

    console.log(`🔢 [IndexedDB] Counting items in: ${dbName}/${storeName}`);
    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count(query);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Count result: ${request.result} items`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Count failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if a key exists
   */
  async exists(
    dbName: string,
    storeName: string,
    key: IDBValidKey
  ): Promise<boolean> {
    const data = await this.get(dbName, storeName, key);
    return data !== undefined;
  }

  /**
   * Batch put operations for better performance
   */
  async batchPut<T>(
    dbName: string,
    storeName: string,
    items: Array<{ data: T; key?: IDBValidKey }>
  ): Promise<IDBValidKey[]> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    const startTime = performance.now();
    console.log(`📦 [IndexedDB] === BATCH PUT OPERATION STARTED ===`);
    console.log(`📦 [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`📦 [IndexedDB] Items: ${items.length}`);

    const db = await this.ensureDatabase(dbName);
    const results: IDBValidKey[] = [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      let completed = 0;

      transaction.oncomplete = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] === BATCH PUT COMPLETE ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Items processed: ${results.length}`);

        this.recordOperation('write', duration, dbName, storeName);
        resolve(results);
      };

      transaction.onerror = () => {
        console.error(`❌ [IndexedDB] Batch put failed:`, transaction.error);
        reject(transaction.error);
      };

      // Process all items
      for (const item of items) {
        const request = item.key ? store.put(item.data, item.key) : store.put(item.data);

        request.onsuccess = () => {
          results.push(request.result);
          completed++;
        };

        request.onerror = () => {
          console.error(`❌ [IndexedDB] Batch item failed:`, request.error);
          reject(request.error);
        };
      }
    });
  }

  /**
   * Create a key range for querying
   */
  createKeyRange(
    lower?: any,
    upper?: any,
    lowerOpen = false,
    upperOpen = false
  ): IDBKeyRange | undefined {
    if (!this.isSupported()) {
      return undefined;
    }

    return this.platform.onlyOnBrowser(() => {
      if (lower !== undefined && upper !== undefined) {
        return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
      } else if (lower !== undefined) {
        return IDBKeyRange.lowerBound(lower, lowerOpen);
      } else if (upper !== undefined) {
        return IDBKeyRange.upperBound(upper, upperOpen);
      }
      return undefined;
    });
  }

  /**
   * Close a database connection
   */
  closeDatabase(dbName: string): void {
    const db = this.databases.get(dbName);
    if (db) {
      console.log(`🔒 [IndexedDB] Closing database: ${dbName}`);
      db.close();
      this.databases.delete(dbName);
    }
  }

  /**
   * Delete an entire database
   */
  async deleteDatabase(dbName: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    console.log(`💥 [IndexedDB] === DELETING DATABASE ===`);
    console.log(`💥 [IndexedDB] Database: ${dbName}`);

    // Close if open
    this.closeDatabase(dbName);

    return this.platform.onlyOnBrowser(async () => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);

        request.onsuccess = () => {
          console.log(`✅ [IndexedDB] Database deleted successfully: ${dbName}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`❌ [IndexedDB] Failed to delete database: ${dbName}`, request.error);
          reject(request.error);
        };

        request.onblocked = () => {
          console.warn(`⚠️ [IndexedDB] Database deletion blocked: ${dbName} (close all tabs using this database)`);
        };
      });
    }) || Promise.resolve();
  }

  /**
   * Get storage estimate (if available)
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (!this.isSupported()) {
      return null;
    }

    return this.platform.onlyOnBrowser(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const result: StorageEstimate = {
          usage: estimate.usage,
          quota: estimate.quota
        };

        if (estimate.usage && estimate.quota) {
          result.percentage = (estimate.usage / estimate.quota) * 100;
        }

        console.log(`📊 [IndexedDB] Storage estimate:`, {
          usage: estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(2)} MB` : 'unknown',
          quota: estimate.quota ? `${(estimate.quota / 1024 / 1024).toFixed(2)} MB` : 'unknown',
          percentage: result.percentage ? `${result.percentage.toFixed(1)}%` : 'unknown'
        });

        return result;
      }
      console.warn(`⚠️ [IndexedDB] Storage estimate API not available`);
      return null;
    }) || null;
  }

  /**
   * Get current database metrics
   */
  getMetrics(): DbMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      operations: { read: 0, write: 0, delete: 0, clear: 0 },
      totalSize: 0,
      lastUpdated: Date.now(),
      performance: {
        avgReadTime: 0,
        avgWriteTime: 0,
        operations: []
      },
      collections: {}
    };
    console.log(`📊 [IndexedDB] Metrics reset`);
  }

  /**
   * Get cache hit ratio (reads vs total operations)
   */
  getCacheHitRatio(): number {
    const totalOps = Object.values(this.metrics.operations).reduce((sum, count) => sum + count, 0);
    return totalOps > 0 ? this.metrics.operations.read / totalOps : 0;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): { avgReadTime: number; avgWriteTime: number; totalOperations: number } {
    return {
      avgReadTime: this.metrics.performance.avgReadTime,
      avgWriteTime: this.metrics.performance.avgWriteTime,
      totalOperations: this.metrics.performance.operations.length
    };
  }

  /**
   * Record operation metrics (internal helper)
   */
  private recordOperation(
    type: DbOperation,
    duration: number,
    dbName: string,
    storeName: string,
    collection?: string,
    tier?: string
  ): void {
    // Update operation count
    this.metrics.operations[type]++;
    this.metrics.lastUpdated = Date.now();

    // Record performance data
    const operation = {
      type,
      duration,
      timestamp: Date.now(),
      dbName,
      storeName,
      collection,
      tier
    };

    this.metrics.performance.operations.push(operation);

    // Update collection-specific metrics if collection is provided
    if (collection) {
      this.updateCollectionMetrics(collection, type, duration, tier);
    }

    // Keep only recent operations (prevent memory bloat)
    if (this.metrics.performance.operations.length > this.MAX_PERFORMANCE_LOGS) {
      this.metrics.performance.operations = this.metrics.performance.operations.slice(-this.MAX_PERFORMANCE_LOGS);
    }

    // Update average times
    this.updateAverages();

    const collectionInfo = collection ? ` | Collection: ${collection}` : '';
    const tierInfo = tier ? ` | Tier: [${tier}]` : '';
    console.log(`📊 [IndexedDB] Metrics updated: ${type} operation took ${duration.toFixed(1)}ms${collectionInfo}${tierInfo}`);
  }

  /**
   * Update collection-specific metrics
   */
  private updateCollectionMetrics(collection: string, type: DbOperation, duration: number, tier?: string): void {
    if (!this.metrics.collections[collection]) {
      this.metrics.collections[collection] = {
        operations: 0,
        avgLatency: 0,
        totalSize: 0,
        tier,
        lastAccessed: Date.now()
      };
    }

    const collectionMetrics = this.metrics.collections[collection];
    const oldAvg = collectionMetrics.avgLatency;
    const oldCount = collectionMetrics.operations;

    // Update running average latency
    collectionMetrics.avgLatency = (oldAvg * oldCount + duration) / (oldCount + 1);
    collectionMetrics.operations++;
    collectionMetrics.lastAccessed = Date.now();

    // Update tier if provided
    if (tier) {
      collectionMetrics.tier = tier;
    }
  }

  /**
   * Update average performance times (internal helper)
   */
  private updateAverages(): void {
    const readOps = this.metrics.performance.operations.filter(op => op.type === 'read');
    const writeOps = this.metrics.performance.operations.filter(op => op.type === 'write');

    this.metrics.performance.avgReadTime = readOps.length > 0
      ? readOps.reduce((sum, op) => sum + op.duration, 0) / readOps.length
      : 0;

    this.metrics.performance.avgWriteTime = writeOps.length > 0
      ? writeOps.reduce((sum, op) => sum + op.duration, 0) / writeOps.length
      : 0;
  }

  /**
   * Extract collection name from cache key for metrics tracking
   */
  private extractCollectionFromKey(key: IDBValidKey): string | undefined {
    if (typeof key === 'string') {
      // Handle patterns like "collection:users" or "doc:users/123"
      if (key.startsWith('collection:')) {
        return key.replace('collection:', '');
      } else if (key.startsWith('doc:')) {
        const path = key.replace('doc:', '');
        return path.split('/')[0]; // Extract collection from document path
      }
    }
    return undefined;
  }

  /**
   * Ensure database is open (internal helper)
   */
  private async ensureDatabase(dbName: string): Promise<IDBDatabase> {
    const db = this.databases.get(dbName);
    if (!db) {
      console.error(`❌ [IndexedDB] Database not opened: ${dbName}`);
      console.error(`❌ [IndexedDB] Available databases: [${Array.from(this.databases.keys()).join(', ')}]`);
      throw new Error(`[IndexedDB] Database not opened: ${dbName}. Call openDatabase() first.`);
    }
    return db;
  }
}
