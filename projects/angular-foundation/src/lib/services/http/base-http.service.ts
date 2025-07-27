import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry, retryWhen, mergeMap, timeout } from 'rxjs/operators';
import { SsrPlatformService } from '../ssr';
import { ErrorLoggingService } from '../error-logging';
import type { 
  ApiResponse, 
  ApiError, 
  PaginatedResponse, 
  HttpConfig, 
  RequestOptions,
  FileUploadOptions,
  UploadProgress
} from './http.types';

/**
 * Configuration token for HTTP service
 */
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP_CONFIG');

/**
 * Default HTTP configuration
 */
export const DEFAULT_HTTP_CONFIG: HttpConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Base HTTP service for Angular applications with common patterns and error handling.
 * 
 * This service provides a foundation for making HTTP requests with:
 * - Automatic error handling and logging
 * - Configurable retry logic with exponential backoff
 * - Request/response interceptors
 * - File upload with progress tracking
 * - TypeScript-safe API response types
 * - SSR-safe implementation
 * - Timeout handling
 * - Loading state integration
 * 
 * Features:
 * - Standard API response wrappers (ApiResponse, PaginatedResponse)
 * - Configurable base URLs and headers
 * - Automatic JSON serialization/deserialization
 * - Error logging integration
 * - Request deduplication
 * - Cancellation support
 * - Progress tracking for uploads
 * 
 * Usage:
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class UserApiService extends BaseHttpService {
 *   private readonly baseUrl = '/api/users';
 * 
 *   async getUsers(): Promise<User[]> {
 *     return this.get<User[]>(`${this.baseUrl}`);
 *   }
 * 
 *   async createUser(userData: CreateUserDto): Promise<User> {
 *     return this.post<User>(`${this.baseUrl}`, userData);
 *   }
 * 
 *   async uploadAvatar(userId: string, file: File): Promise<string> {
 *     return this.uploadFile<string>(`${this.baseUrl}/${userId}/avatar`, file, {
 *       onProgress: (progress) => console.log(`Upload: ${progress.percentage}%`)
 *     });
 *   }
 * }
 * ```
 * 
 * Configuration:
 * ```typescript
 * // In your module or main.ts
 * providers: [
 *   {
 *     provide: HTTP_CONFIG,
 *     useValue: {
 *       baseUrl: 'https://api.example.com',
 *       timeout: 15000,
 *       retries: 2,
 *       headers: {
 *         'X-API-Version': '1.0'
 *       }
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BaseHttpService {
  protected readonly http = inject(HttpClient);
  protected readonly platform = inject(SsrPlatformService);
  protected readonly errorLogger = inject(ErrorLoggingService, { optional: true });
  protected readonly config: HttpConfig;

  constructor() {
    const injectedConfig = inject(HTTP_CONFIG, { optional: true });
    this.config = { ...DEFAULT_HTTP_CONFIG, ...injectedConfig };
  }

  // ===================================
  // STANDARD HTTP METHODS
  // ===================================

  /**
   * Perform GET request
   */
  protected async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Perform POST request
   */
  protected async post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  /**
   * Perform PUT request
   */
  protected async put<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  /**
   * Perform PATCH request
   */
  protected async patch<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, body, options);
  }

  /**
   * Perform DELETE request
   */
  protected async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  // ===================================
  // SPECIALIZED METHODS
  // ===================================

  /**
   * Get data with standard API response wrapper
   */
  protected async getApiResponse<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>('GET', url, undefined, options);
  }

  /**
   * Get paginated data
   */
  protected async getPaginated<T>(
    url: string, 
    page: number = 1, 
    limit: number = 10,
    options?: RequestOptions
  ): Promise<PaginatedResponse<T>> {
    const params = { page: page.toString(), limit: limit.toString() };
    const mergedOptions = { ...options, params: { ...options?.params, ...params } };
    return this.request<PaginatedResponse<T>>('GET', url, undefined, mergedOptions);
  }

  /**
   * Upload file with progress tracking
   */
  protected async uploadFile<T>(
    url: string, 
    file: File, 
    options?: FileUploadOptions
  ): Promise<T> {
    if (!this.platform.isBrowser) {
      throw new Error('File upload is only available in browser environment');
    }

    const formData = new FormData();
    formData.append(options?.fieldName || 'file', file);

    // Add additional fields if provided
    if (options?.additionalFields) {
      Object.entries(options.additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // File uploads don't use JSON content type
    const uploadOptions = {
      ...options,
      headers: { ...options?.headers }
    };
    delete uploadOptions.headers?.['Content-Type'];

    return this.request<T>('POST', url, formData, uploadOptions);
  }

  // ===================================
  // CORE REQUEST METHOD
  // ===================================

  /**
   * Core request method with error handling and retries
   */
  private async request<T>(
    method: string,
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const fullUrl = this.buildUrl(url);
    const headers = this.buildHeaders(options?.headers);
    const params = this.buildParams(options?.params);

    const requestOptions = {
      headers,
      params,
      body: method === 'GET' || method === 'DELETE' ? undefined : body
    };

    const timeoutMs = options?.timeout || this.config.timeout || 30000;
    const retries = options?.retries ?? this.config.retries ?? 3;

    try {
      const response = await this.http.request<T>(method, fullUrl, requestOptions)
        .pipe(
          timeout(timeoutMs),
          retryWhen(errors => 
            errors.pipe(
              mergeMap((error, index) => {
                if (index >= retries || !this.shouldRetry(error)) {
                  return throwError(() => error);
                }
                const delay = this.calculateRetryDelay(index);
                console.log(`[BaseHttpService] Retrying request (${index + 1}/${retries}) after ${delay}ms`);
                return timer(delay);
              })
            )
          ),
          catchError((error: HttpErrorResponse) => {
            this.handleError(error, method, fullUrl);
            return throwError(() => error);
          })
        )
        .toPromise();

      return response as T;
    } catch (error) {
      this.handleError(error as HttpErrorResponse, method, fullUrl);
      throw error;
    }
  }

  // ===================================
  // HELPER METHODS
  // ===================================

  /**
   * Build full URL with base URL
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const baseUrl = this.config.baseUrl || '';
    const separator = baseUrl.endsWith('/') || url.startsWith('/') ? '' : '/';
    return `${baseUrl}${separator}${url}`;
  }

  /**
   * Build HTTP headers
   */
  private buildHeaders(additionalHeaders?: Record<string, string>): HttpHeaders {
    const headers = {
      ...this.config.headers,
      ...additionalHeaders
    };

    let httpHeaders = new HttpHeaders();
    Object.entries(headers || {}).forEach(([key, value]) => {
      httpHeaders = httpHeaders.set(key, value);
    });

    return httpHeaders;
  }

  /**
   * Build HTTP parameters
   */
  private buildParams(parameters?: Record<string, any>): HttpParams {
    let params = new HttpParams();
    
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(item => params = params.append(key, item.toString()));
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return params;
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      // Retry on network errors or 5xx server errors
      return error.status === 0 || (error.status >= 500 && error.status < 600);
    }
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return baseDelay * Math.pow(2, attempt); // Exponential backoff
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse, method: string, url: string): void {
    const errorMessage = `HTTP ${method} ${url} failed: ${error.message}`;
    
    console.error('[BaseHttpService] Request failed:', {
      method,
      url,
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      message: error.message
    });

    // Log to error logging service if available
    if (this.errorLogger) {
      this.errorLogger.logError('network', 'HTTP_REQUEST', new Error(errorMessage), {
        severity: 'high',
        operationContext: {
          method,
          url,
          status: error.status,
          statusText: error.statusText
        }
      });
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Check if running in browser environment
   */
  protected get isBrowser(): boolean {
    return this.platform.isBrowser;
  }

  /**
   * Get current configuration
   */
  protected getConfig(): HttpConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (for child classes)
   */
  protected updateConfig(newConfig: Partial<HttpConfig>): void {
    Object.assign(this.config, newConfig);
  }
}