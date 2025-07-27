import { Injectable, inject, signal, InjectionToken } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Default error logging configuration
 */
export const DEFAULT_ERROR_LOGGING_CONFIG = {
  maxStoredErrors: 100,
  enableConsoleLogging: true,
  enableLocalStorage: true,
  localStorageKey: 'app_error_logs',
  defaultSeverity: 'medium' as ErrorSeverity,
  enableStackTrace: true,
  enableUserContext: true,
  enableSystemContext: true
} as const;

/**
 * Error logging configuration interface
 */
export interface ErrorLoggingConfig {
  maxStoredErrors: number;
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  localStorageKey: string;
  defaultSeverity: ErrorSeverity;
  enableStackTrace: boolean;
  enableUserContext: boolean;
  enableSystemContext: boolean;
}

/**
 * Injection token for error logging configuration
 */
export const ERROR_LOGGING_CONFIG = new InjectionToken<ErrorLoggingConfig>('ERROR_LOGGING_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_ERROR_LOGGING_CONFIG
});

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Generic error categories - applications can extend this
 */
export type ErrorCategory = 'auth' | 'network' | 'database' | 'validation' | 'ui' | 'api' | 'system' | 'unknown' | string;

/**
 * Application error interface
 */
export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  timestamp: number;

  // User context
  userId?: string;
  userAgent?: string;

  // Operation context
  operation: string;
  operationContext?: Record<string, any>;

  // System context
  url?: string;
  route?: string;

  // Resolution tracking
  resolved?: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Error statistics interface
 */
export interface ErrorStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: AppError[];
  topCategories: Array<{ category: string; count: number }>;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: AppError) => void | Promise<void>;

/**
 * Generic error logging service for Angular applications.
 *
 * This service provides comprehensive error tracking and management functionality
 * with local storage, categorization, severity levels, and extensible handling.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Configurable error storage and management
 * - Local storage persistence with size limits
 * - Error categorization and severity levels
 * - Comprehensive error context capture
 * - Signal-based reactive state management
 * - Extensible error handling with custom handlers
 * - Error resolution tracking and management
 * - Statistics and analytics for error monitoring
 * - Automatic stack trace capture
 * - User and system context enrichment
 *
 * Use cases:
 * - Application error monitoring and debugging
 * - User experience issue tracking
 * - Performance problem identification
 * - Security incident logging
 * - Business logic error analysis
 * - Quality assurance and testing support
 * - Production error diagnostics
 *
 * Example usage:
 * ```typescript
 * const errorService = inject(ErrorLoggingService);
 *
 * // Basic error logging
 * try {
 *   // Some operation
 * } catch (error) {
 *   await errorService.logError('api', 'fetchUserData', error, {
 *     severity: 'high',
 *     operationContext: { userId: '123' }
 *   });
 * }
 *
 * // Subscribe to error state
 * errorService.recentErrors$.subscribe(errors => {
 *   console.log('Recent errors:', errors.length);
 * });
 *
 * // Get error statistics
 * const stats = errorService.getErrorStats();
 * console.log('Total errors:', stats.totalErrors);
 *
 * // Add custom error handler
 * errorService.addErrorHandler(async (error) => {
 *   if (error.severity === 'critical') {
 *     // Send to monitoring service
 *     await sendToMonitoring(error);
 *   }
 * });
 *
 * // Resolve an error
 * await errorService.resolveError(errorId, 'Fixed by updating API endpoint');
 *
 * // Custom configuration
 * providers: [
 *   {
 *     provide: ERROR_LOGGING_CONFIG,
 *     useValue: {
 *       ...DEFAULT_ERROR_LOGGING_CONFIG,
 *       maxStoredErrors: 500,
 *       enableConsoleLogging: false
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ErrorLoggingService {
  private readonly platform = inject(SsrPlatformService);
  private readonly config = inject(ERROR_LOGGING_CONFIG);

  // Error storage
  private _errors: AppError[] = [];
  private _errorHandlers: ErrorHandler[] = [];

  // Reactive state
  private readonly _recentErrors = signal<AppError[]>([]);
  private readonly _errorCounts = signal<Record<string, number>>({});
  private readonly _loading = signal(false);

  readonly recentErrors$ = this._recentErrors.asReadonly();
  readonly errorCounts$ = this._errorCounts.asReadonly();
  readonly loading$ = this._loading.asReadonly();

  constructor() {
    console.log('[ErrorLoggingService] 🚨 Service initialized');
    this._loadStoredErrors();
  }

  /**
   * Log an error with full context
   */
  async logError(
    category: ErrorCategory,
    operation: string,
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      operationContext?: Record<string, any>;
      customMessage?: string;
      userId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const errorId = this._generateErrorId();
    const timestamp = Date.now();

    console.log(`[ErrorLoggingService] 🚨 Logging ${category} error (${errorId}):`, { operation, error });

    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = this.config.enableStackTrace && error instanceof Error ? error.stack : undefined;

      const appError: AppError = {
        id: errorId,
        category,
        severity: options.severity || this.config.defaultSeverity,
        message: options.customMessage || errorMessage,
        stackTrace,
        timestamp,

        // User context
        userId: options.userId,
        userAgent: this.config.enableUserContext && this.platform.isBrowser ? navigator.userAgent : undefined,

        // Operation context
        operation,
        operationContext: options.operationContext,

        // System context
        url: this.config.enableSystemContext && this.platform.isBrowser ? window.location.href : undefined,
        route: this.config.enableSystemContext && this.platform.isBrowser ? window.location.pathname : undefined,

        resolved: false,
        metadata: options.metadata
      };

      // Store error
      this._addError(appError);

      // Console logging
      if (this.config.enableConsoleLogging) {
        this._logToConsole(appError, error);
      }

      // Trigger custom handlers
      await this._triggerErrorHandlers(appError);

      console.log(`[ErrorLoggingService] ✅ Error logged with ID: ${errorId}`);
      return errorId;

    } catch (loggingError) {
      console.error(`[ErrorLoggingService] ❌ Failed to log error (${errorId}):`, loggingError);

      // Fallback console logging
      console.error(`[${category.toUpperCase()}] ${operation}:`, error);
      throw loggingError;
    }
  }

  /**
   * Log a network error with context
   */
  async logNetworkError(
    operation: string,
    error: Error | string,
    options: {
      url?: string;
      method?: string;
      status?: number;
      response?: any;
      severity?: ErrorSeverity;
    } = {}
  ): Promise<string> {
    return this.logError('network', operation, error, {
      severity: options.severity || 'high',
      operationContext: {
        url: options.url,
        method: options.method,
        status: options.status,
        response: options.response,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a validation error with context
   */
  async logValidationError(
    operation: string,
    error: Error | string,
    options: {
      field?: string;
      value?: any;
      constraints?: string[];
      severity?: ErrorSeverity;
    } = {}
  ): Promise<string> {
    return this.logError('validation', operation, error, {
      severity: options.severity || 'medium',
      operationContext: {
        field: options.field,
        value: options.value,
        constraints: options.constraints,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get all stored errors
   */
  getAllErrors(): AppError[] {
    return [...this._errors];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this._errors.filter(error => error.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this._errors.filter(error => error.severity === severity);
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): AppError[] {
    return this._errors.filter(error => !error.resolved);
  }

  /**
   * Get recent errors (last N errors)
   */
  getRecentErrors(limit: number = 50): AppError[] {
    return this._errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Mark an error as resolved
   */
  async resolveError(errorId: string, resolution: string, resolvedBy?: string): Promise<void> {
    const error = this._errors.find(e => e.id === errorId);
    if (!error) {
      throw new Error(`Error with ID ${errorId} not found`);
    }

    error.resolved = true;
    error.resolvedAt = Date.now();
    error.resolvedBy = resolvedBy || 'system';
    error.resolution = resolution;

    this._updateReactiveState();
    this._saveToLocalStorage();

    console.log(`[ErrorLoggingService] ✅ Error ${errorId} marked as resolved`);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const totalErrors = this._errors.length;
    const unresolvedErrors = this._errors.filter(e => !e.resolved);
    const recentErrors = this.getRecentErrors(20);

    // Count by category
    const errorsByCategory: Record<string, number> = {};
    this._errors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    // Count by severity
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    this._errors.forEach(error => {
      errorsBySeverity[error.severity]++;
    });

    // Top categories
    const topCategories = Object.entries(errorsByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors,
      unresolvedErrors: unresolvedErrors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      topCategories
    };
  }

  /**
   * Add custom error handler
   */
  addErrorHandler(handler: ErrorHandler): void {
    this._errorHandlers.push(handler);
    console.log('[ErrorLoggingService] Added custom error handler');
  }

  /**
   * Remove custom error handler
   */
  removeErrorHandler(handler: ErrorHandler): void {
    const index = this._errorHandlers.indexOf(handler);
    if (index > -1) {
      this._errorHandlers.splice(index, 1);
      console.log('[ErrorLoggingService] Removed custom error handler');
    }
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this._errors = [];
    this._updateReactiveState();
    this._saveToLocalStorage();
    console.log('[ErrorLoggingService] 🗑️ All errors cleared');
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    this._errors = this._errors.filter(error => !error.resolved);
    this._updateReactiveState();
    this._saveToLocalStorage();
    console.log('[ErrorLoggingService] 🗑️ Resolved errors cleared');
  }

  /**
   * Export errors as JSON
   */
  exportErrors(): string {
    return JSON.stringify(this._errors, null, 2);
  }

  /**
   * Import errors from JSON
   */
  importErrors(jsonData: string): void {
    try {
      const errors: AppError[] = JSON.parse(jsonData);
      this._errors = errors;
      this._updateReactiveState();
      this._saveToLocalStorage();
      console.log(`[ErrorLoggingService] 📥 Imported ${errors.length} errors`);
    } catch (error) {
      console.error('[ErrorLoggingService] ❌ Failed to import errors:', error);
      throw new Error('Invalid JSON format for error import');
    }
  }

  // Private methods

  private _generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private _addError(error: AppError): void {
    this._errors.unshift(error); // Add to beginning for chronological order

    // Maintain size limit
    if (this._errors.length > this.config.maxStoredErrors) {
      this._errors = this._errors.slice(0, this.config.maxStoredErrors);
    }

    this._updateReactiveState();
    this._saveToLocalStorage();
  }

  private _updateReactiveState(): void {
    this._recentErrors.set(this.getRecentErrors());

    // Update counts
    const counts: Record<string, number> = {};
    this._errors.forEach(error => {
      counts[error.category] = (counts[error.category] || 0) + 1;
    });
    this._errorCounts.set(counts);
  }

  private _logToConsole(appError: AppError, originalError: Error | string): void {
    const severity = appError.severity.toUpperCase();
    const category = appError.category.toUpperCase();

    console.group(`[${severity}] [${category}] ${appError.operation}`);
    console.error('Message:', appError.message);
    if (appError.stackTrace) {
      console.error('Stack:', appError.stackTrace);
    }
    if (appError.operationContext) {
      console.error('Context:', appError.operationContext);
    }
    console.error('Original:', originalError);
    console.groupEnd();
  }

  private async _triggerErrorHandlers(error: AppError): Promise<void> {
    for (const handler of this._errorHandlers) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('[ErrorLoggingService] Error handler failed:', handlerError);
      }
    }
  }

  private _loadStoredErrors(): void {
    if (!this.config.enableLocalStorage || !this.platform.isBrowser) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.localStorageKey);
      if (stored) {
        this._errors = JSON.parse(stored);
        this._updateReactiveState();
        console.log(`[ErrorLoggingService] 📥 Loaded ${this._errors.length} stored errors`);
      }
    } catch (error) {
      console.warn('[ErrorLoggingService] Failed to load stored errors:', error);
    }
  }

  private _saveToLocalStorage(): void {
    if (!this.config.enableLocalStorage || !this.platform.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(this._errors));
    } catch (error) {
      console.warn('[ErrorLoggingService] Failed to save errors to localStorage:', error);
    }
  }
}
