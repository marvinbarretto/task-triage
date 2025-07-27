import { Injectable, inject, InjectionToken } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Default feature flags configuration
 */
export const DEFAULT_FEATURE_FLAGS_CONFIG = {
  flags: {} as Record<string, any>,
  enableAllForDev: false,
  isDevelopment: false,
  storageKey: 'feature_flags_overrides',
  enableLocalOverrides: true,
  logFlagUsage: true
} as const;

/**
 * Feature flags configuration interface
 */
export interface FeatureFlagsConfig {
  flags: Record<string, any>;
  enableAllForDev: boolean;
  isDevelopment: boolean;
  storageKey: string;
  enableLocalOverrides: boolean;
  logFlagUsage: boolean;
}

/**
 * Injection token for feature flags configuration
 */
export const FEATURE_FLAGS_CONFIG = new InjectionToken<FeatureFlagsConfig>('FEATURE_FLAGS_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_FEATURE_FLAGS_CONFIG
});

/**
 * Feature flag override interface for local storage
 */
export interface FeatureFlagOverride {
  key: string;
  value: any;
  enabled: boolean;
  timestamp: number;
}

/**
 * Feature flag usage statistics
 */
export interface FeatureFlagStats {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  overriddenFlags: number;
  mostUsedFlags: Array<{ flag: string; count: number }>;
  usage: Record<string, number>;
}

/**
 * Generic feature flags service for Angular applications.
 *
 * This service provides comprehensive feature flag management with support for
 * nested flags, local overrides, development modes, and usage analytics.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Configurable feature flag definitions with dependency injection
 * - Support for nested feature flags (e.g., 'user.profile.newUI')
 * - Local storage overrides for testing and development
 * - Development mode that can enable all flags
 * - Feature flag usage tracking and analytics
 * - Type-safe flag checking with generic support
 * - Runtime flag toggling for debugging
 * - Bulk flag operations and management
 *
 * Use cases:
 * - A/B testing and experimentation
 * - Gradual feature rollouts
 * - Environment-specific feature enablement
 * - Development and debugging workflows
 * - Beta feature management
 * - Performance optimization toggles
 * - UI/UX variations and themes
 *
 * Example usage:
 * ```typescript
 * // Configure feature flags
 * providers: [
 *   {
 *     provide: FEATURE_FLAGS_CONFIG,
 *     useValue: {
 *       flags: {
 *         newDashboard: true,
 *         betaFeatures: false,
 *         payments: {
 *           creditCard: true,
 *           paypal: false,
 *           crypto: false
 *         },
 *         ui: {
 *           darkMode: true,
 *           newNavigation: false
 *         }
 *       },
 *       enableAllForDev: true,
 *       isDevelopment: !environment.production
 *     }
 *   }
 * ]
 *
 * // Use in components/services
 * const featureFlags = inject(FeatureFlagsService);
 *
 * // Simple flag checking
 * if (featureFlags.isEnabled('newDashboard')) {
 *   // Show new dashboard
 * }
 *
 * // Nested flag checking
 * if (featureFlags.isEnabled('payments.creditCard')) {
 *   // Enable credit card payments
 * }
 *
 * // Type-safe flag checking
 * const dashboardEnabled = featureFlags.getFlag<boolean>('newDashboard');
 *
 * // Runtime overrides (development/testing)
 * featureFlags.setOverride('betaFeatures', true);
 *
 * // Get usage statistics
 * const stats = featureFlags.getStats();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly platform = inject(SsrPlatformService);
  private readonly config = inject(FEATURE_FLAGS_CONFIG);

  private _overrides: Record<string, FeatureFlagOverride> = {};
  private _usage: Record<string, number> = {};

  constructor() {
    console.log('[FeatureFlagsService] 🏁 Service initialized');
    console.log('[FeatureFlagsService] Available flags:', Object.keys(this.config.flags));
    this._loadOverrides();
  }

  /**
   * Check if a feature flag is enabled (supports nested flags)
   */
  isEnabled(flag: string): boolean {
    // Track usage
    if (this.config.logFlagUsage) {
      this._trackUsage(flag);
    }

    // Development mode override
    if (this.config.isDevelopment && this.config.enableAllForDev) {
      console.log(`[FeatureFlagsService] 🚀 Dev mode - enabling all flags: ${flag} = true`);
      return true;
    }

    // Check for local override first
    if (this.config.enableLocalOverrides) {
      const override = this._overrides[flag];
      if (override && override.enabled) {
        console.log(`[FeatureFlagsService] 🔧 Local override: ${flag} = ${override.value}`);
        return this._coerceToBoolean(override.value);
      }
    }

    // Handle nested flags (e.g., 'payments.creditCard')
    if (flag.includes('.')) {
      return this._getNestedFlag(flag);
    }

    // Get flag from config
    const flagValue = this.config.flags[flag];
    const result = this._coerceToBoolean(flagValue);

    if (this.config.logFlagUsage) {
      console.log(`[FeatureFlagsService] 🏁 Flag check: ${flag} = ${result}`);
    }

    return result;
  }

  /**
   * Get flag value with type safety
   */
  getFlag<T = any>(flag: string): T | null {
    if (this.config.logFlagUsage) {
      this._trackUsage(flag);
    }

    // Check for local override first
    if (this.config.enableLocalOverrides) {
      const override = this._overrides[flag];
      if (override && override.enabled) {
        return override.value as T;
      }
    }

    // Handle nested flags
    if (flag.includes('.')) {
      return this._getNestedFlagValue<T>(flag);
    }

    // Get flag from config
    const flagValue = this.config.flags[flag];
    return flagValue !== undefined ? (flagValue as T) : null;
  }

  /**
   * Get all flag values with their status
   */
  getAllFlags(): Record<string, { value: any; isOverridden: boolean; isEnabled: boolean }> {
    const result: Record<string, { value: any; isOverridden: boolean; isEnabled: boolean }> = {};

    // Get all nested flag paths
    const allPaths = this._getAllFlagPaths(this.config.flags);

    for (const path of allPaths) {
      const override = this._overrides[path];
      const isOverridden = override && override.enabled;

      result[path] = {
        value: isOverridden ? override.value : this.getFlag(path),
        isOverridden: Boolean(isOverridden),
        isEnabled: this.isEnabled(path)
      };
    }

    return result;
  }

  /**
   * Set a local override for a feature flag
   */
  setOverride(flag: string, value: any): void {
    if (!this.config.enableLocalOverrides) {
      console.warn('[FeatureFlagsService] Local overrides are disabled');
      return;
    }

    this._overrides[flag] = {
      key: flag,
      value,
      enabled: true,
      timestamp: Date.now()
    };

    this._saveOverrides();
    console.log(`[FeatureFlagsService] 🔧 Override set: ${flag} = ${value}`);
  }

  /**
   * Remove a local override
   */
  removeOverride(flag: string): void {
    if (this._overrides[flag]) {
      delete this._overrides[flag];
      this._saveOverrides();
      console.log(`[FeatureFlagsService] 🗑️ Override removed: ${flag}`);
    }
  }

  /**
   * Clear all local overrides
   */
  clearAllOverrides(): void {
    this._overrides = {};
    this._saveOverrides();
    console.log('[FeatureFlagsService] 🗑️ All overrides cleared');
  }

  /**
   * Get all active overrides
   */
  getOverrides(): Record<string, FeatureFlagOverride> {
    return { ...this._overrides };
  }

  /**
   * Toggle a feature flag override
   */
  toggleOverride(flag: string): void {
    const currentValue = this.isEnabled(flag);
    this.setOverride(flag, !currentValue);
  }

  /**
   * Bulk set multiple overrides
   */
  setMultipleOverrides(flags: Record<string, any>): void {
    Object.entries(flags).forEach(([flag, value]) => {
      this.setOverride(flag, value);
    });
  }

  /**
   * Check if flag is overridden locally
   */
  isOverridden(flag: string): boolean {
    const override = this._overrides[flag];
    return override && override.enabled;
  }

  /**
   * Get feature flag usage statistics
   */
  getStats(): FeatureFlagStats {
    const allFlags = this.getAllFlags();
    const flagEntries = Object.entries(allFlags);

    const enabledFlags = flagEntries.filter(([_, info]) => info.isEnabled).length;
    const overriddenFlags = flagEntries.filter(([_, info]) => info.isOverridden).length;

    // Most used flags
    const mostUsedFlags = Object.entries(this._usage)
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFlags: flagEntries.length,
      enabledFlags,
      disabledFlags: flagEntries.length - enabledFlags,
      overriddenFlags,
      mostUsedFlags,
      usage: { ...this._usage }
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    this._usage = {};
    console.log('[FeatureFlagsService] 📊 Usage statistics reset');
  }

  /**
   * Export current configuration and overrides
   */
  exportConfig(): {
    flags: Record<string, any>;
    overrides: Record<string, FeatureFlagOverride>;
    stats: FeatureFlagStats;
  } {
    return {
      flags: this.config.flags,
      overrides: this.getOverrides(),
      stats: this.getStats()
    };
  }

  /**
   * Import overrides configuration
   */
  importOverrides(overrides: Record<string, FeatureFlagOverride>): void {
    this._overrides = { ...overrides };
    this._saveOverrides();
    console.log(`[FeatureFlagsService] 📥 Imported ${Object.keys(overrides).length} overrides`);
  }

  // Private methods

  private _getNestedFlag(flag: string): boolean {
    const value = this._getNestedFlagValue(flag);
    return this._coerceToBoolean(value);
  }

  private _getNestedFlagValue<T = any>(flag: string): T | null {
    const parts = flag.split('.');
    let current: any = this.config.flags;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current as T;
  }

  private _getAllFlagPaths(obj: any, prefix = ''): string[] {
    const paths: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursive for nested objects
        paths.push(...this._getAllFlagPaths(value, currentPath));
      } else {
        // Leaf node
        paths.push(currentPath);
      }
    }

    return paths;
  }

  private _coerceToBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return Boolean(value);
  }

  private _trackUsage(flag: string): void {
    this._usage[flag] = (this._usage[flag] || 0) + 1;
  }

  private _loadOverrides(): void {
    if (!this.config.enableLocalOverrides || !this.platform.isBrowser) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this._overrides = JSON.parse(stored);
        console.log(`[FeatureFlagsService] 📥 Loaded ${Object.keys(this._overrides).length} overrides`);
      }
    } catch (error) {
      console.warn('[FeatureFlagsService] Failed to load overrides:', error);
    }
  }

  private _saveOverrides(): void {
    if (!this.config.enableLocalOverrides || !this.platform.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this._overrides));
    } catch (error) {
      console.warn('[FeatureFlagsService] Failed to save overrides:', error);
    }
  }
}
