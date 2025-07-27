import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorLoggingService } from '../../error-logging';
import { ToastService } from '../../toast';

/**
 * HTTP Interceptor for centralized error handling
 * 
 * This interceptor catches HTTP errors and provides:
 * - Centralized error logging
 * - User-friendly error notifications
 * - Consistent error handling across the application
 * - Optional custom error handling per request
 * 
 * Usage:
 * ```typescript
 * // In your app config or main.ts
 * providers: [
 *   provideHttpClient(
 *     withInterceptors([errorHandlingInterceptor])
 *   )
 * ]
 * ```
 * 
 * Skip error handling for specific requests:
 * ```typescript
 * // Add header to skip automatic error handling
 * const headers = { 'X-Skip-Error-Handling': 'true' };
 * this.http.get('/api/data', { headers });
 * ```
 */
export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const errorLogger = inject(ErrorLoggingService, { optional: true });
  const toastService = inject(ToastService, { optional: true });

  // Check if request wants to skip automatic error handling
  const skipErrorHandling = req.headers.has('X-Skip-Error-Handling');

  if (skipErrorHandling) {
    // Remove the header before sending request
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Error-Handling')
    });
    return next(cleanReq);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      handleHttpError(error, errorLogger, toastService);
      return throwError(() => error);
    })
  );
};

/**
 * Handle HTTP error with logging and user notification
 */
function handleHttpError(
  error: HttpErrorResponse,
  errorLogger: ErrorLoggingService | null,
  toastService: ToastService | null
): void {
  let userMessage = 'An unexpected error occurred';
  let logLevel: 'error' | 'warn' = 'error';

  // Determine user-friendly message based on status
  switch (error.status) {
    case 0:
      userMessage = 'Network error - please check your connection';
      break;
    case 400:
      userMessage = 'Invalid request - please check your input';
      break;
    case 401:
      userMessage = 'Authentication required - please log in';
      break;
    case 403:
      userMessage = 'Access denied - insufficient permissions';
      break;
    case 404:
      userMessage = 'Resource not found';
      logLevel = 'warn';
      break;
    case 408:
      userMessage = 'Request timeout - please try again';
      break;
    case 429:
      userMessage = 'Too many requests - please wait and try again';
      break;
    case 500:
      userMessage = 'Server error - please try again later';
      break;
    case 502:
    case 503:
    case 504:
      userMessage = 'Service temporarily unavailable';
      break;
    default:
      if (error.status >= 400 && error.status < 500) {
        userMessage = 'Client error - please check your request';
      } else if (error.status >= 500) {
        userMessage = 'Server error - please try again later';
      }
  }

  // Show user notification if toast service is available
  if (toastService) {
    toastService.error(userMessage);
  }

  // Log error details if error logger is available
  if (errorLogger) {
    const errorDetails = {
      url: error.url || 'unknown',
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      body: error.error
    };

    if (logLevel === 'error') {
      errorLogger.logError('network', 'HTTP_INTERCEPTOR', new Error(`HTTP ${error.status}: ${error.message}`), {
        severity: 'high',
        operationContext: errorDetails
      });
    } else {
      errorLogger.logError('network', 'HTTP_INTERCEPTOR', new Error(`HTTP ${error.status}: ${error.message}`), {
        severity: 'medium',
        operationContext: errorDetails
      });
    }
  }

  // Console log for development
  console.error('[ErrorHandlingInterceptor] HTTP Error:', {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    message: error.message,
    error: error.error
  });
}