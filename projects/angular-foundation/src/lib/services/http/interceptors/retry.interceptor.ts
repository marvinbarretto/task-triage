import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { retryWhen, mergeMap, timer, throwError } from 'rxjs';

/**
 * Configuration for retry interceptor
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryCondition: (error: HttpErrorResponse) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBackoff: true,
  retryCondition: (error: HttpErrorResponse) => {
    // Retry on network errors or 5xx server errors
    return error.status === 0 || (error.status >= 500 && error.status < 600);
  }
};

/**
 * Injection token for retry configuration
 */
export const RETRY_CONFIG = new InjectionToken<RetryConfig>('RETRY_CONFIG');

/**
 * HTTP Interceptor for automatic request retries with exponential backoff
 * 
 * This interceptor automatically retries failed HTTP requests based on:
 * - Configurable retry conditions (default: network errors and 5xx)
 * - Exponential backoff delay strategy
 * - Maximum retry limits
 * - Per-request retry control
 * 
 * Usage:
 * ```typescript
 * // In your app config or main.ts
 * providers: [
 *   {
 *     provide: RETRY_CONFIG,
 *     useValue: {
 *       maxRetries: 2,
 *       initialDelay: 500,
 *       exponentialBackoff: true,
 *       retryCondition: (error) => error.status >= 500
 *     }
 *   },
 *   provideHttpClient(
 *     withInterceptors([retryInterceptor])
 *   )
 * ]
 * ```
 * 
 * Disable retries for specific requests:
 * ```typescript
 * // Add header to disable retries
 * const headers = { 'X-No-Retry': 'true' };
 * this.http.get('/api/data', { headers });
 * ```
 * 
 * Custom retry count for specific requests:
 * ```typescript
 * // Set custom retry count
 * const headers = { 'X-Retry-Count': '5' };
 * this.http.get('/api/data', { headers });
 * ```
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const injectedConfig = inject(RETRY_CONFIG, { optional: true });
  const config = { ...DEFAULT_RETRY_CONFIG, ...injectedConfig };

  // Check if request wants to disable retries
  const noRetry = req.headers.has('X-No-Retry');
  
  if (noRetry) {
    // Remove the header before sending request
    const cleanReq = req.clone({
      headers: req.headers.delete('X-No-Retry')
    });
    return next(cleanReq);
  }

  // Check for custom retry count
  const customRetryHeader = req.headers.get('X-Retry-Count');
  const maxRetries = customRetryHeader ? parseInt(customRetryHeader, 10) : config.maxRetries;

  // Clean up retry headers before sending request
  let cleanReq = req;
  if (req.headers.has('X-Retry-Count')) {
    cleanReq = req.clone({
      headers: req.headers.delete('X-Retry-Count')
    });
  }

  return next(cleanReq).pipe(
    retryWhen(errors => 
      errors.pipe(
        mergeMap((error: HttpErrorResponse, attemptIndex) => {
          // Check if we should retry this error
          if (!config.retryCondition(error)) {
            console.log(`[RetryInterceptor] Not retrying error ${error.status} - doesn't match retry condition`);
            return throwError(() => error);
          }

          // Check if we've exceeded max retries
          if (attemptIndex >= maxRetries) {
            console.log(`[RetryInterceptor] Max retries (${maxRetries}) exceeded for ${req.method} ${req.url}`);
            return throwError(() => error);
          }

          // Calculate delay
          const delay = calculateDelay(attemptIndex, config);
          
          console.log(`[RetryInterceptor] Retrying ${req.method} ${req.url} (attempt ${attemptIndex + 1}/${maxRetries}) after ${delay}ms`);
          
          return timer(delay);
        })
      )
    )
  );
};

/**
 * Calculate retry delay based on configuration
 */
function calculateDelay(attemptIndex: number, config: RetryConfig): number {
  if (!config.exponentialBackoff) {
    return config.initialDelay;
  }

  // Exponential backoff with jitter
  const exponentialDelay = config.initialDelay * Math.pow(2, attemptIndex);
  
  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * exponentialDelay;
  const delayWithJitter = exponentialDelay + jitter;
  
  // Cap at maximum delay
  return Math.min(delayWithJitter, config.maxDelay);
}

/**
 * Utility function to create custom retry conditions
 */
export function createRetryCondition(
  statusCodes: number[],
  includeNetworkErrors = true
): (error: HttpErrorResponse) => boolean {
  return (error: HttpErrorResponse) => {
    if (includeNetworkErrors && error.status === 0) {
      return true;
    }
    return statusCodes.includes(error.status);
  };
}

/**
 * Pre-built retry conditions for common scenarios
 */
export const RetryConditions = {
  /**
   * Retry on network errors and all server errors (5xx)
   */
  serverErrorsAndNetwork: (error: HttpErrorResponse) => 
    error.status === 0 || (error.status >= 500 && error.status < 600),

  /**
   * Retry only on network errors
   */
  networkOnly: (error: HttpErrorResponse) => error.status === 0,

  /**
   * Retry on specific server errors
   */
  specificServerErrors: (error: HttpErrorResponse) => 
    [500, 502, 503, 504].includes(error.status),

  /**
   * Retry on timeouts and server errors
   */
  timeoutsAndServerErrors: (error: HttpErrorResponse) =>
    error.status === 0 || error.status === 408 || (error.status >= 500 && error.status < 600),

  /**
   * Never retry (disable retries)
   */
  never: () => false
};