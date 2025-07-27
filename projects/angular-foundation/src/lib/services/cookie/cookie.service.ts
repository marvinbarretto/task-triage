import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Options for setting cookies
 */
export interface CookieOptions {
  expires?: Date | number;    // Expiration date or days from now
  path?: string;             // Cookie path (default: '/')
  domain?: string;           // Cookie domain
  secure?: boolean;          // HTTPS only
  sameSite?: 'Strict' | 'Lax' | 'None';  // SameSite policy (default: 'Lax')
}

/**
 * Generic cookie management service with SSR safety.
 *
 * This service provides a robust cookie management system for any Angular application
 * that needs to work with HTTP cookies in both browser and server environments.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Flexible cookie options (expires, path, domain, secure, sameSite)
 * - Automatic URL encoding/decoding of cookie values
 * - Support for both date-based and day-based expiration
 * - Comprehensive cookie manipulation (get, set, delete, check existence)
 * - Debug logging for development
 *
 * Use cases:
 * - User preferences and settings persistence
 * - Authentication tokens and session management
 * - User consent and tracking preferences
 * - Theme preferences and UI state
 * - Shopping cart persistence
 * - Analytics and tracking data
 *
 * Example usage:
 * ```typescript
 * const cookieService = inject(CookieService);
 *
 * // Simple cookie
 * cookieService.setCookie('theme', 'dark');
 *
 * // Cookie with options
 * cookieService.setCookie('userToken', token, {
 *   expires: 7,              // 7 days from now
 *   secure: true,           // HTTPS only
 *   sameSite: 'Strict'      // Strict same-site policy
 * });
 *
 * // Get cookie value
 * const theme = cookieService.getCookie('theme');
 *
 * // Check if cookie exists
 * if (cookieService.hasCookie('userToken')) {
 *   // Handle authenticated user
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly platform = inject(SsrPlatformService);

  /**
   * Get a cookie value by name
   */
  getCookie(name: string): string | null {
    if (!this.platform.isBrowser) return null;

    const match = document.cookie.match(
      new RegExp('(^| )' + name + '=([^;]+)')
    );
    const value = match ? decodeURIComponent(match[2]) : null;
    console.log(`[CookieService] getCookie("${name}") =>`, value);
    return value;
  }

  /**
   * Set a cookie with optional configuration
   */
  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    if (!this.platform.isBrowser) return;

    const {
      expires,
      path = '/',
      domain,
      secure,
      sameSite = 'Lax'
    } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    // Handle expiration
    if (expires !== undefined) {
      let expirationDate: Date;

      if (typeof expires === 'number') {
        // Number of days from now
        expirationDate = new Date(Date.now() + expires * 86400000);
      } else {
        // Specific date
        expirationDate = expires;
      }

      cookieString += `; expires=${expirationDate.toUTCString()}`;
    }

    // Add other options
    cookieString += `; path=${path}`;

    if (domain) {
      cookieString += `; domain=${domain}`;
    }

    if (secure) {
      cookieString += `; secure`;
    }

    cookieString += `; SameSite=${sameSite}`;

    document.cookie = cookieString;
    console.log(
      `[CookieService] setCookie("${name}", "${value}") =>`,
      cookieString
    );
  }

  /**
   * Delete a cookie by name
   */
  deleteCookie(name: string, options: Omit<CookieOptions, 'expires'> = {}): void {
    if (!this.platform.isBrowser) return;

    const { path = '/', domain } = options;

    let cookieString = `${name}=; Max-Age=0; path=${path}`;

    if (domain) {
      cookieString += `; domain=${domain}`;
    }

    cookieString += `; SameSite=Lax`;

    document.cookie = cookieString;
    console.log(`[CookieService] deleteCookie("${name}") =>`, cookieString);
  }

  /**
   * Check if a cookie exists
   */
  hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }

  /**
   * Get all cookie names
   */
  getAllCookieNames(): string[] {
    if (!this.platform.isBrowser) return [];

    return document.cookie
      .split(';')
      .map(cookie => cookie.trim().split('=')[0])
      .filter(name => name.length > 0);
  }

  /**
   * Get all cookies as key-value pairs
   */
  getAllCookies(): Record<string, string> {
    if (!this.platform.isBrowser) return {};

    const cookies: Record<string, string> = {};

    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });

    return cookies;
  }

  /**
   * Clear all cookies (use with caution)
   */
  clearAllCookies(): void {
    if (!this.platform.isBrowser) return;

    const cookieNames = this.getAllCookieNames();
    cookieNames.forEach(name => this.deleteCookie(name));
    console.log(`[CookieService] Cleared ${cookieNames.length} cookies`);
  }

  /**
   * Set a cookie with JSON value (automatically stringifies/parses)
   */
  setJsonCookie(name: string, value: any, options: CookieOptions = {}): void {
    this.setCookie(name, JSON.stringify(value), options);
  }

  /**
   * Get a cookie with JSON value (automatically parses)
   */
  getJsonCookie<T = any>(name: string): T | null {
    const cookieValue = this.getCookie(name);
    if (!cookieValue) return null;

    try {
      return JSON.parse(cookieValue) as T;
    } catch (error) {
      console.warn(`[CookieService] Failed to parse JSON cookie "${name}":`, error);
      return null;
    }
  }

  /**
   * Set a cookie that expires when the browser session ends
   */
  setSessionCookie(name: string, value: string, options: Omit<CookieOptions, 'expires'> = {}): void {
    // Don't set expires - browser will delete on session end
    this.setCookie(name, value, { ...options, expires: undefined });
  }

  /**
   * Check if cookies are enabled in the browser
   */
  areCookiesEnabled(): boolean {
    if (!this.platform.isBrowser) return false;

    // Try to set and read a test cookie
    const testName = '_cookie_test_';
    const testValue = 'test';

    this.setCookie(testName, testValue);
    const retrieved = this.getCookie(testName);
    this.deleteCookie(testName);

    return retrieved === testValue;
  }
}
