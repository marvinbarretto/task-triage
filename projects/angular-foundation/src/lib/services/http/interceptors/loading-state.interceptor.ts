import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { signal } from '@angular/core';

/**
 * Global loading state manager
 */
class LoadingStateManager {
  private readonly _loading = signal(false);
  private activeRequests = 0;

  readonly loading = this._loading.asReadonly();

  incrementRequests(): void {
    this.activeRequests++;
    this._loading.set(true);
  }

  decrementRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this._loading.set(false);
    }
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }
}

// Global singleton instance
const loadingStateManager = new LoadingStateManager();

/**
 * HTTP Interceptor for automatic loading state management
 * 
 * This interceptor automatically manages a global loading state that tracks
 * active HTTP requests. It provides:
 * - Automatic loading state updates
 * - Request counting to handle concurrent requests
 * - Optional per-request loading state control
 * - Integration with UI loading indicators
 * 
 * Usage:
 * ```typescript
 * // In your app config or main.ts
 * providers: [
 *   provideHttpClient(
 *     withInterceptors([loadingStateInterceptor])
 *   )
 * ]
 * 
 * // In your component
 * @Component({
 *   template: `
 *     @if (loadingState.loading()) {
 *       <div class="loading-spinner">Loading...</div>
 *     }
 *   `
 * })
 * export class MyComponent {
 *   readonly loadingState = inject(LoadingStateService);
 * }
 * ```
 * 
 * Skip loading state for specific requests:
 * ```typescript
 * // Add header to skip automatic loading state
 * const headers = { 'X-Skip-Loading': 'true' };
 * this.http.get('/api/data', { headers });
 * ```
 */
export const loadingStateInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if request wants to skip loading state
  const skipLoading = req.headers.has('X-Skip-Loading');

  if (skipLoading) {
    // Remove the header before sending request
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Loading')
    });
    return next(cleanReq);
  }

  // Increment loading state
  loadingStateManager.incrementRequests();

  return next(req).pipe(
    finalize(() => {
      // Decrement loading state when request completes (success or error)
      loadingStateManager.decrementRequests();
    })
  );
};

/**
 * Service to access global loading state
 * 
 * Injectable service that provides access to the global loading state
 * managed by the loading state interceptor.
 */
export class LoadingStateService {
  readonly loading = loadingStateManager.loading;

  /**
   * Get the current number of active requests
   */
  getActiveRequestCount(): number {
    return loadingStateManager.getActiveRequestCount();
  }

  /**
   * Check if any requests are currently active
   */
  hasActiveRequests(): boolean {
    return loadingStateManager.getActiveRequestCount() > 0;
  }
}