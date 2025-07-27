import { signal, computed, inject, effect } from '@angular/core';
import type { CollectionStore } from './store-contracts';
import { SsrPlatformService } from '../services/ssr';
import { ToastService } from '../services/toast';

/**
 * Optional auth store interface for applications that need user-aware state management
 * Applications should provide their own implementation of this interface
 */
export interface AuthStoreInterface {
  readonly user: () => { uid: string } | null;
}

/**
 * Configuration for BaseStore behavior
 */
export interface BaseStoreConfig {
  /** Whether to automatically load data when user changes */
  autoLoadOnUserChange?: boolean;
  /** Whether to reset data when switching users */
  resetOnUserChange?: boolean;
  /** Custom error handling function */
  onError?: (error: Error, storeName: string) => void;
}

/**
 * Abstract base class for collection-based stores that follow the Angular Foundation architecture.
 * 
 * This class provides a complete implementation of the CollectionStore interface with:
 * - Reactive state management using Angular signals
 * - User-aware data loading and cleanup
 * - CRUD operations with optimistic updates
 * - Error handling and loading states
 * - Debug utilities and type safety
 * 
 * Features:
 * - Auth-reactive: Automatically reloads data when user changes
 * - Concurrent load protection: Prevents duplicate API calls
 * - Memory efficient: Proper cleanup and state management
 * - Extensible: Hook methods for custom behavior
 * - Type-safe: Full TypeScript support with generics
 * - Observable: Uses Angular signals for reactive UI updates
 * 
 * Usage:
 * ```typescript
 * interface User { id: string; name: string; email: string; }
 * 
 * @Injectable({ providedIn: 'root' })
 * export class UserStore extends BaseStore<User> {
 *   private readonly userService = inject(UserService);
 * 
 *   protected async fetchData(): Promise<User[]> {
 *     return this.userService.getUsers();
 *   }
 * 
 *   async add(userData: Omit<User, 'id'>): Promise<User> {
 *     const newUser = await this.userService.createUser(userData);
 *     this.addItem(newUser);
 *     return newUser;
 *   }
 * }
 * ```
 * 
 * Advanced usage with auth integration:
 * ```typescript
 * export class UserStore extends BaseStore<User> {
 *   constructor() {
 *     super({
 *       autoLoadOnUserChange: true,
 *       resetOnUserChange: false,
 *       onError: (error, storeName) => {
 *         console.error(`${storeName} error:`, error);
 *         this.analytics.track('store_error', { store: storeName, error: error.message });
 *       }
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseStore<T> implements CollectionStore<T> {
  protected readonly platform = inject(SsrPlatformService);
  private readonly toastService = inject(ToastService, { optional: true });
  
  // Optional auth store injection - applications can provide their own
  protected readonly authStore?: AuthStoreInterface;

  // Configuration
  private readonly config: Required<BaseStoreConfig>;

  // ✅ Signals (CollectionStoreSignals)
  protected readonly _data = signal<T[]>([]);
  protected readonly _loading = signal(false);
  protected readonly _error = signal<string | null>(null);
  protected readonly _userId = signal<string | null>(null);
  protected readonly _hasLoaded = signal(false);

  // ✅ Public readonly signals
  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Derived signals
  readonly hasData = computed(() => this._data().length > 0);
  readonly isEmpty = computed(() => this._data().length === 0);
  readonly itemCount = computed(() => this._data().length);
  readonly userId = this._userId.asReadonly();

  protected constructor(
    config: BaseStoreConfig = {},
    authStore?: AuthStoreInterface
  ) {
    this.config = {
      autoLoadOnUserChange: true,
      resetOnUserChange: true,
      onError: (error, storeName) => {
        this.toastService?.error(`${storeName}: ${error.message}`);
      },
      ...config
    };

    this.authStore = authStore;

    // Set up auth reactivity if auth store is provided
    if (this.authStore && this.config.autoLoadOnUserChange) {
      this.setupAuthReactivity();
    }
  }

  private setupAuthReactivity(): void {
    if (!this.authStore) return;

    effect(() => {
      const user = this.authStore!.user();
      const userId = user?.uid ?? null;
      const prevUserId = this._userId();

      // ✅ Only act on actual user changes
      if (userId !== prevUserId) {
        console.log(`[${this.constructor.name}] Auth changed: ${prevUserId} → ${userId}`);

        // ✅ Update user ID first
        this._userId.set(userId);

        // ✅ Handle user changes based on configuration
        if (this.config.resetOnUserChange && prevUserId !== null && userId !== null && prevUserId !== userId) {
          console.log(`[${this.constructor.name}] User switched, resetting data`);
          this.resetForUser(userId);
        } else if (prevUserId !== null && userId === null) {
          console.log(`[${this.constructor.name}] User logged out, clearing data`);
          this.reset();
        }

        // ✅ Load data for authenticated user
        if (userId && this.config.autoLoadOnUserChange) {
          this.loadOnce();
        }
      }
    });
  }

  // ✅ Load tracking - private property
  protected hasLoaded = false;

  // ✅ Prevent concurrent loads
  private loadPromise: Promise<void> | null = null;

  /**
   * Load data only if not already loaded (recommended default)
   */
  async loadOnce(): Promise<void> {
    if (this.hasLoaded || (this.authStore && !this._userId())) {
      console.log(`[${this.constructor.name}] ⏭ Skipping loadOnce — already loaded or no user`);
      return;
    }

    // ✅ Return existing promise if load in progress
    if (this.loadPromise) {
      console.log(`[${this.constructor.name}] ⏳ Load already in progress, waiting...`);
      return this.loadPromise;
    }

    return this.load();
  }

  /**
   * Force reload data regardless of current state
   */
  async load(): Promise<void> {
    // ✅ Return existing promise if load in progress
    if (this.loadPromise) {
      console.log(`[${this.constructor.name}] ⏳ Load already in progress, waiting...`);
      return this.loadPromise;
    }

    // ✅ Create and store the load promise
    this.loadPromise = this._performLoad();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Internal load implementation
   */
  private async _performLoad(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const freshData = await this.fetchData();
      this._data.set(freshData);
      this.hasLoaded = true;
      console.log(`[${this.constructor.name}] ✅ Loaded ${freshData.length} items`);
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(error?.message || 'Failed to load data');
      this._error.set(errorObj.message);
      this.config.onError(errorObj, this.constructor.name);
      console.error(`[${this.constructor.name}] ❌ Load failed:`, error);
    } finally {
      this._loading.set(false);
    }
  }

  // ✅ REQUIRED CRUD METHODS (CrudMethods)

  async add(item: Omit<T, 'id'>): Promise<T> {
    // This should be overridden in child classes for actual persistence
    const newItem = { ...item, id: crypto.randomUUID() } as T;
    this.addItem(newItem);
    return newItem;
  }

  async addMany(items: Omit<T, 'id'>[]): Promise<T[]> {
    const newItems = items.map(item => ({ ...item, id: crypto.randomUUID() } as T));
    this._data.update(current => [...current, ...newItems]);
    return newItems;
  }

  get(id: string): T | undefined {
    return this.findItem(item => (item as any).id === id);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.findItem(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.data().filter(predicate);
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    this.updateItem(item => (item as any).id === id, updates);
  }

  async updateMany(updates: Array<{id: string; changes: Partial<T>}>): Promise<void> {
    for (const { id, changes } of updates) {
      await this.update(id, changes);
    }
  }

  async remove(id: string): Promise<void> {
    this.removeItem(item => (item as any).id === id);
  }

  async removeMany(ids: string[]): Promise<void> {
    this.removeItem(item => ids.includes((item as any).id));
  }

  // ✅ REQUIRED STATE METHODS (StateMethods)

  /**
   * Clear all data and reset to initial state
   */
  reset(): void {
    this._data.set([]);
    this._error.set(null);
    this._loading.set(false);
    this.hasLoaded = false;
    this.loadPromise = null; // ✅ Clear any pending loads
    this.onReset();
    console.log(`[${this.constructor.name}] 🔄 Reset complete`);
  }

  /**
   * Clear error state only
   */
  clearError(): void {
    this._error.set(null);
  }

  // ✅ REQUIRED UTILITY METHODS (UtilityMethods)

  /**
   * Get debug information about store state
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      itemCount: this.itemCount(),
      hasLoaded: this.hasLoaded,
      loading: this.loading(),
      error: this.error(),
      hasData: this.hasData(),
      isEmpty: this.isEmpty(),
      userId: this._userId(),
      // Add sample of data for debugging
      sampleData: this.data().slice(0, 2), // First 2 items
    };
  }

  // ✅ REQUIRED ABSTRACT METHOD (CollectionStore)

  /**
   * Abstract method that child stores must implement to fetch data
   */
  protected abstract fetchData(): Promise<T[]>;

  // ===================================
  // 🔧 PROTECTED HELPER METHODS
  // ===================================

  /**
   * Add item to the store
   */
  protected addItem(item: T): void {
    this._data.update(current => [...current, item]);
  }

  /**
   * Update item by predicate
   */
  protected updateItem(predicate: (item: T) => boolean, updates: Partial<T>): void {
    this._data.update(current =>
      current.map(item =>
        predicate(item) ? { ...item, ...updates } : item
      )
    );
  }

  /**
   * Remove item by predicate
   */
  protected removeItem(predicate: (item: T) => boolean): void {
    this._data.update(current => current.filter(item => !predicate(item)));
  }

  /**
   * Get item by predicate
   */
  protected findItem(predicate: (item: T) => boolean): T | undefined {
    return this.data().find(predicate);
  }

  /**
   * Check if item exists
   */
  protected hasItem(predicate: (item: T) => boolean): boolean {
    return this.data().some(predicate);
  }

  /**
   * Batch operations for performance
   */
  protected batchUpdate(operations: (() => void)[]): void {
    operations.forEach(op => op());
  }

  /**
   * Optional: Store-specific cleanup - override in child stores if needed
   */
  protected onReset(): void {
    // Override in child stores if needed
  }

  // ===================================
  // 🏗️ USER-AWARE EXTENSIONS
  // ===================================

  /**
   * Load with user context (for auth-reactive stores)
   */
  async loadForUser(userId: string): Promise<void> {
    console.log(`[${this.constructor.name}] 📡 Loading data for user:`, userId);
    await this.load(); // Use existing load logic
  }

  /**
   * Reset with user context - override in child stores for cache handling
   */
  resetForUser(userId?: string): void {
    console.log(`[${this.constructor.name}] 🔄 Resetting for user:`, userId || 'anonymous');

    // ✅ Let child stores handle their own cache strategy
    this.onUserReset(userId);

    // Reset the store state
    this.reset();
  }

  /**
   * Override in child stores to handle user-specific cache clearing
   */
  protected onUserReset(userId?: string): void {
    // Default: do nothing
    // Override in stores that need user-specific cache handling
  }

  // ===================================
  // 🧪 CONVENIENCE GETTERS
  // ===================================

  /**
   * Check loading state (convenience getter)
   */
  get isLoading(): boolean {
    return this._loading();
  }

  /**
   * Check error state (convenience getter)
   */
  get hasError(): boolean {
    return !!this._error();
  }
}