import { Injectable } from '@angular/core';

/**
 * Standalone utility class for Telegram-related text processing and formatting.
 * 
 * This class provides static utility methods that are commonly needed when working
 * with Telegram Bot API, including text escaping, user agent parsing, URL processing,
 * and timestamp formatting.
 * 
 * Features:
 * - Markdown and HTML text escaping for safe message formatting
 * - User agent parsing for readable device information
 * - URL path extraction for cleaner message display
 * - Timestamp formatting with locale support
 * - Framework-agnostic static methods for maximum reusability
 * - Independent testability without service dependencies
 * 
 * Example usage:
 * ```typescript
 * // Static method usage (recommended)
 * const escapedText = TelegramUtils.escapeMarkdown('User *input* text');
 * const deviceInfo = TelegramUtils.parseUserAgent(navigator.userAgent);
 * const cleanPath = TelegramUtils.extractPath('https://example.com/path?query=1');
 * 
 * // Injectable service usage (for dependency injection)
 * const utils = inject(TelegramUtils);
 * const formatted = utils.formatTimestamp(new Date());
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TelegramUtils {
  
  /**
   * Escape special Markdown characters for Telegram MarkdownV1 format.
   * 
   * Escapes characters that have special meaning in Telegram's Markdown parser
   * to prevent formatting issues when displaying user-generated content.
   * 
   * @param text - The text to escape
   * @returns The escaped text safe for Telegram Markdown
   * 
   * @example
   * ```typescript
   * const userInput = "Hello *world* [link](url)";
   * const escaped = TelegramUtils.escapeMarkdown(userInput);
   * // Result: "Hello \\*world\\* \\[link\\]\\(url\\)"
   * ```
   */
  static escapeMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/[*_`\[\]()~>#+=|{}.!-]/g, '\\$&');
  }

  /**
   * Escape special HTML characters for Telegram HTML format.
   * 
   * Escapes characters that have special meaning in HTML to prevent
   * parsing issues when using HTML parse mode in Telegram.
   * 
   * @param text - The text to escape
   * @returns The escaped text safe for Telegram HTML
   * 
   * @example
   * ```typescript
   * const userInput = "Hello <script>alert('xss')</script>";
   * const escaped = TelegramUtils.escapeHtml(userInput);
   * // Result: "Hello &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
   * ```
   */
  static escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Parse user agent string to extract readable browser/device information.
   * 
   * Simplifies complex user agent strings into human-readable device/browser
   * descriptions for better notification context.
   * 
   * @param userAgent - The user agent string to parse
   * @returns A simplified, readable device/browser description
   * 
   * @example
   * ```typescript
   * const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
   * const device = TelegramUtils.parseUserAgent(ua);
   * // Result: "Chrome Browser"
   * ```
   */
  static parseUserAgent(userAgent: string): string {
    if (!userAgent) return 'Unknown Browser';
    
    // Check for specific browsers
    if (userAgent.includes('Chrome')) {
      if (userAgent.includes('Edg/')) return 'Edge Browser';
      if (userAgent.includes('OPR/')) return 'Opera Browser';
      return 'Chrome Browser';
    }
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      if (userAgent.includes('Mobile')) return 'Mobile Safari';
      return 'Safari Browser';
    }
    if (userAgent.includes('Mobile')) return 'Mobile Browser';
    if (userAgent.includes('Electron')) return 'Desktop App';
    
    return 'Unknown Browser';
  }

  /**
   * Extract the path, query, and hash components from a URL.
   * 
   * Removes the protocol, domain, and port from URLs to create cleaner,
   * more readable path information for notifications.
   * 
   * @param url - The full URL to process
   * @returns The path + query + hash portion, or original string if invalid URL
   * 
   * @example
   * ```typescript
   * const fullUrl = "https://example.com:8080/api/users?page=1#section";
   * const path = TelegramUtils.extractPath(fullUrl);
   * // Result: "/api/users?page=1#section"
   * ```
   */
  static extractPath(url: string): string {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      // If URL parsing fails, return the original string
      return url;
    }
  }

  /**
   * Format a timestamp into a localized, readable string.
   * 
   * Converts Date objects into locale-appropriate timestamp strings
   * suitable for display in notifications.
   * 
   * @param date - The date to format
   * @param locale - Optional locale string (defaults to system locale)
   * @param options - Optional Intl.DateTimeFormatOptions for custom formatting
   * @returns A formatted timestamp string
   * 
   * @example
   * ```typescript
   * const now = new Date();
   * const formatted = TelegramUtils.formatTimestamp(now);
   * // Result: "1/15/2025, 2:30:45 PM" (depending on locale)
   * 
   * // Custom formatting
   * const custom = TelegramUtils.formatTimestamp(now, 'en-US', {
   *   year: 'numeric',
   *   month: 'short',
   *   day: 'numeric',
   *   hour: '2-digit',
   *   minute: '2-digit'
   * });
   * // Result: "Jan 15, 2025, 02:30 PM"
   * ```
   */
  static formatTimestamp(
    date: Date, 
    locale?: string, 
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    try {
      return date.toLocaleString(locale, options || defaultOptions);
    } catch {
      // Fallback to ISO string if locale formatting fails
      return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    }
  }

  /**
   * Format metadata object into a readable string for notifications.
   * 
   * Converts object metadata into a comma-separated string with formatted
   * key-value pairs, handling nested objects and filtering out null/undefined values.
   * 
   * @param metadata - The metadata object to format
   * @returns A formatted string representation of the metadata
   * 
   * @example
   * ```typescript
   * const meta = { userId: '123', plan: 'premium', active: true };
   * const formatted = TelegramUtils.formatMetadata(meta);
   * // Result: "user id: 123, plan: premium, active: true"
   * ```
   */
  static formatMetadata(metadata: Record<string, any>): string {
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }

    try {
      const entries = Object.entries(metadata)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          // Convert camelCase to readable format
          const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
          
          // Handle different value types
          let formattedValue: string;
          if (typeof value === 'object') {
            formattedValue = JSON.stringify(value);
          } else if (typeof value === 'boolean') {
            formattedValue = value ? 'yes' : 'no';
          } else {
            formattedValue = String(value);
          }
          
          return `${formattedKey}: ${formattedValue}`;
        });

      return entries.join(', ');
    } catch {
      return 'Invalid metadata';
    }
  }

  /**
   * Truncate text to a specified length with ellipsis.
   * 
   * Safely truncates text to fit within Telegram's message length limits
   * while preserving word boundaries when possible.
   * 
   * @param text - The text to truncate
   * @param maxLength - Maximum length (default: 4096, Telegram's limit)
   * @param preserveWords - Whether to preserve word boundaries (default: true)
   * @returns The truncated text with ellipsis if needed
   * 
   * @example
   * ```typescript
   * const longText = "This is a very long message that exceeds limits...";
   * const truncated = TelegramUtils.truncateText(longText, 20);
   * // Result: "This is a very long..."
   * ```
   */
  static truncateText(text: string, maxLength: number = 4096, preserveWords: boolean = true): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    if (preserveWords) {
      const truncated = text.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastSpace > maxLength * 0.7) {
        return truncated.substring(0, lastSpace) + '...';
      }
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate a consistent emoji for different notification types.
   * 
   * Maps notification types to appropriate emojis for visual consistency
   * across different parts of an application.
   * 
   * @param type - The notification type
   * @returns The appropriate emoji for the type
   * 
   * @example
   * ```typescript
   * const emoji = TelegramUtils.getTypeEmoji('error');
   * // Result: "❌"
   * ```
   */
  static getTypeEmoji(type?: string): string {
    const typeEmojis: Record<string, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      bug: '🐛',
      suggestion: '💡',
      confusion: '❓',
      security: '🛡️',
      performance: '⚡',
      feature: '🚀',
      user: '👤',
      system: '⚙️',
      payment: '💳',
      order: '📦',
      notification: '🔔',
      message: '💬',
      alert: '🚨'
    };

    return typeEmojis[type || 'info'] || '📝';
  }

  // Instance methods for dependency injection usage
  
  /**
   * Instance method wrapper for escapeMarkdown static method
   */
  escapeMarkdown(text: string): string {
    return TelegramUtils.escapeMarkdown(text);
  }

  /**
   * Instance method wrapper for escapeHtml static method
   */
  escapeHtml(text: string): string {
    return TelegramUtils.escapeHtml(text);
  }

  /**
   * Instance method wrapper for parseUserAgent static method
   */
  parseUserAgent(userAgent: string): string {
    return TelegramUtils.parseUserAgent(userAgent);
  }

  /**
   * Instance method wrapper for extractPath static method
   */
  extractPath(url: string): string {
    return TelegramUtils.extractPath(url);
  }

  /**
   * Instance method wrapper for formatTimestamp static method
   */
  formatTimestamp(date: Date, locale?: string, options?: Intl.DateTimeFormatOptions): string {
    return TelegramUtils.formatTimestamp(date, locale, options);
  }

  /**
   * Instance method wrapper for formatMetadata static method
   */
  formatMetadata(metadata: Record<string, any>): string {
    return TelegramUtils.formatMetadata(metadata);
  }

  /**
   * Instance method wrapper for truncateText static method
   */
  truncateText(text: string, maxLength?: number, preserveWords?: boolean): string {
    return TelegramUtils.truncateText(text, maxLength, preserveWords);
  }

  /**
   * Instance method wrapper for getTypeEmoji static method
   */
  getTypeEmoji(type?: string): string {
    return TelegramUtils.getTypeEmoji(type);
  }
}