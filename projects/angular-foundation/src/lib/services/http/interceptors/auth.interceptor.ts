import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Interface for authentication token provider
 */
export interface AuthTokenProvider {
  getToken(): string | null | Promise<string | null>;
  getTokenType(): 'Bearer' | 'Basic' | 'Custom';
}

/**
 * Configuration for auth interceptor
 */
export interface AuthInterceptorConfig {
  tokenProvider: AuthTokenProvider;
  excludedUrls?: string[];
  includedUrls?: string[];
  tokenHeader?: string;
}

/**
 * Injection token for auth interceptor configuration
 */
export const AUTH_INTERCEPTOR_CONFIG = new InjectionToken<AuthInterceptorConfig>('AUTH_INTERCEPTOR_CONFIG');

/**
 * Default authentication token provider (returns null - no auth)
 */
export const NULL_AUTH_PROVIDER: AuthTokenProvider = {
  getToken: () => null,
  getTokenType: () => 'Bearer'
};

/**
 * HTTP Interceptor for automatic authentication token injection
 * 
 * This interceptor automatically adds authentication tokens to outgoing requests:
 * - Configurable token providers
 * - Support for different token types (Bearer, Basic, Custom)
 * - URL-based inclusion/exclusion rules
 * - Per-request authentication control
 * - Async token retrieval support
 * 
 * Usage:
 * ```typescript
 * // Create a token provider
 * const authTokenProvider: AuthTokenProvider = {
 *   getToken: () => localStorage.getItem('auth_token'),
 *   getTokenType: () => 'Bearer'
 * };
 * 
 * // In your app config or main.ts
 * providers: [
 *   {
 *     provide: AUTH_CONFIG,
 *     useValue: {
 *       tokenProvider: authTokenProvider,
 *       excludedUrls: ['/api/public', '/api/auth/login'],
 *       tokenHeader: 'Authorization'
 *     }
 *   },
 *   provideHttpClient(
 *     withInterceptors([authInterceptor])
 *   )
 * ]
 * ```
 * 
 * Skip authentication for specific requests:
 * ```typescript
 * // Add header to skip auth
 * const headers = { 'X-Skip-Auth': 'true' };
 * this.http.get('/api/public-data', { headers });
 * ```
 * 
 * Use custom token for specific requests:
 * ```typescript
 * // Add custom authorization header
 * const headers = { 'Authorization': 'Bearer custom-token' };
 * this.http.get('/api/data', { headers });
 * ```
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AUTH_INTERCEPTOR_CONFIG, { optional: true });

  // If no config provided, pass through without modification
  if (!config) {
    return next(req);
  }

  // Check if request wants to skip auth
  const skipAuth = req.headers.has('X-Skip-Auth');
  
  if (skipAuth) {
    // Remove the header before sending request
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Auth')
    });
    return next(cleanReq);
  }

  // Check if request already has Authorization header
  const tokenHeader = config.tokenHeader || 'Authorization';
  if (req.headers.has(tokenHeader)) {
    // Request already has auth header, don't override
    return next(req);
  }

  // Check URL rules
  if (!shouldAddAuth(req.url, config)) {
    return next(req);
  }

  // Get token (handle both sync and async)
  const tokenResult = config.tokenProvider.getToken();
  
  if (tokenResult instanceof Promise) {
    // Handle async token retrieval - convert Promise to Observable
    return from(tokenResult).pipe(
      switchMap(token => {
        const authedReq = addAuthHeader(req, token, config);
        return next(authedReq);
      })
    );
  } else {
    // Handle sync token retrieval
    const authedReq = addAuthHeader(req, tokenResult, config);
    return next(authedReq);
  }
};

/**
 * Determine if authentication should be added to this URL
 */
function shouldAddAuth(url: string, config: AuthInterceptorConfig): boolean {
  // If includedUrls is specified, only add auth to matching URLs
  if (config.includedUrls && config.includedUrls.length > 0) {
    return config.includedUrls.some(pattern => matchesPattern(url, pattern));
  }

  // If excludedUrls is specified, don't add auth to matching URLs
  if (config.excludedUrls && config.excludedUrls.length > 0) {
    return !config.excludedUrls.some(pattern => matchesPattern(url, pattern));
  }

  // Default: add auth to all requests
  return true;
}

/**
 * Check if URL matches a pattern (supports wildcards)
 */
function matchesPattern(url: string, pattern: string): boolean {
  // Convert pattern to regex (simple wildcard support)
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

/**
 * Add authentication header to request
 */
function addAuthHeader(req: HttpRequest<any>, token: string | null, config: AuthInterceptorConfig): HttpRequest<any> {
  if (!token) {
    return req;
  }

  const tokenHeader = config.tokenHeader || 'Authorization';
  const tokenType = config.tokenProvider.getTokenType();
  
  let headerValue: string;
  
  switch (tokenType) {
    case 'Bearer':
      headerValue = `Bearer ${token}`;
      break;
    case 'Basic':
      headerValue = `Basic ${token}`;
      break;
    case 'Custom':
      headerValue = token; // Token should already be formatted
      break;
    default:
      headerValue = `Bearer ${token}`;
  }

  return req.clone({
    headers: req.headers.set(tokenHeader, headerValue)
  });
}

/**
 * Utility function to create token provider from simple token getter
 */
export function createTokenProvider(
  tokenGetter: () => string | null | Promise<string | null>,
  tokenType: 'Bearer' | 'Basic' | 'Custom' = 'Bearer'
): AuthTokenProvider {
  return {
    getToken: tokenGetter,
    getTokenType: () => tokenType
  };
}

/**
 * Pre-built token providers for common scenarios
 */
export const TokenProviders = {
  /**
   * Get token from localStorage
   */
  localStorage: (key: string = 'auth_token'): AuthTokenProvider => ({
    getToken: () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    getTokenType: () => 'Bearer'
  }),

  /**
   * Get token from sessionStorage
   */
  sessionStorage: (key: string = 'auth_token'): AuthTokenProvider => ({
    getToken: () => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
      return null;
    },
    getTokenType: () => 'Bearer'
  }),

  /**
   * Get token from cookie
   */
  cookie: (cookieName: string): AuthTokenProvider => ({
    getToken: () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(`${cookieName}=`));
        return cookie ? cookie.split('=')[1] : null;
      }
      return null;
    },
    getTokenType: () => 'Bearer'
  }),

  /**
   * Static token provider (useful for testing)
   */
  static: (token: string, tokenType: 'Bearer' | 'Basic' | 'Custom' = 'Bearer'): AuthTokenProvider => ({
    getToken: () => token,
    getTokenType: () => tokenType
  }),

  /**
   * No authentication provider
   */
  none: NULL_AUTH_PROVIDER
};