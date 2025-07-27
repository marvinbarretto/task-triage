import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SsrPlatformService } from '../ssr';
import { TelegramUtils } from './telegram-utils';

/**
 * Default Telegram configuration
 */
export const DEFAULT_TELEGRAM_CONFIG = {
  botToken: '',
  chatId: '',
  apiBaseUrl: 'https://api.telegram.org/bot',
  parseMode: 'Markdown' as TelegramParseMode,
  disableWebPagePreview: true,
  enableRetries: true,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
} as const;

/**
 * Telegram configuration interface
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  apiBaseUrl: string;
  parseMode: TelegramParseMode;
  disableWebPagePreview: boolean;
  enableRetries: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

/**
 * Injection token for Telegram configuration
 */
export const TELEGRAM_CONFIG = new InjectionToken<TelegramConfig>('TELEGRAM_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_TELEGRAM_CONFIG
});

/**
 * Telegram parse modes
 */
export type TelegramParseMode = 'Markdown' | 'MarkdownV2' | 'HTML' | undefined;

/**
 * Generic notification interface
 */
export interface TelegramNotification {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'bug' | 'suggestion' | 'confusion' | string;
  userId?: string;
  userDisplayName?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
  url?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Telegram message options
 */
export interface TelegramMessageOptions {
  chatId?: string;
  parseMode?: TelegramParseMode;
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
}

/**
 * Template message options for formatted messaging
 */
export interface TelegramTemplateOptions extends TelegramMessageOptions {
  variables?: Record<string, any>;
  escapeVariables?: boolean;
}

/**
 * Raw message options for low-level API access
 */
export interface TelegramRawMessageOptions {
  parseMode?: TelegramParseMode;
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  protectContent?: boolean;
  allowSendingWithoutReply?: boolean;
}

/**
 * Telegram API response
 */
export interface TelegramResponse {
  ok: boolean;
  result?: any;
  error_code?: number;
  description?: string;
}

/**
 * Generic Telegram notification service for Angular applications.
 *
 * This service provides comprehensive Telegram Bot API integration for sending
 * notifications, messages, and alerts to Telegram chats with proper formatting,
 * error handling, and retry mechanisms.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Configurable bot token and chat ID via dependency injection
 * - Support for multiple Telegram parse modes (Markdown, HTML)
 * - Generic notification interface for any message type
 * - Automatic message formatting and emoji assignment
 * - Retry mechanism for failed API calls
 * - User agent parsing and URL extraction
 * - Markdown escaping for safe message formatting
 * - Test notification functionality
 * - Multiple chat support with dynamic chat IDs
 * - Error handling that doesn't break application flow
 *
 * Use cases:
 * - Application error notifications and alerts
 * - User feedback and support message forwarding
 * - System monitoring and health check alerts
 * - Business event notifications (orders, payments, etc.)
 * - Development and debugging notifications
 * - User activity and engagement notifications
 * - Security incident and audit log alerts
 *
 * Example usage:
 * ```typescript
 * // Configure Telegram
 * providers: [
 *   {
 *     provide: TELEGRAM_CONFIG,
 *     useValue: {
 *       botToken: 'YOUR_BOT_TOKEN',
 *       chatId: 'YOUR_CHAT_ID',
 *       parseMode: 'Markdown',
 *       enableRetries: true,
 *       maxRetries: 3
 *     }
 *   }
 * ]
 *
 * // Use in services/components
 * const telegramService = inject(TelegramService);
 *
 * // Send generic notification
 * await telegramService.sendNotification({
 *   title: 'New User Registration',
 *   message: 'A new user has registered for the application',
 *   type: 'info',
 *   userDisplayName: 'John Doe',
 *   userEmail: 'john@example.com',
 *   metadata: { plan: 'premium' }
 * });
 *
 * // Send custom message
 * await telegramService.sendMessage('🚨 Critical system alert!');
 *
 * // Send to different chat
 * await telegramService.sendMessage('Message for team', {
 *   chatId: 'TEAM_CHAT_ID'
 * });
 *
 * // Test configuration
 * const isWorking = await telegramService.sendTestNotification();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TelegramNotificationService {
  private readonly platform = inject(SsrPlatformService);
  private readonly config = inject(TELEGRAM_CONFIG);
  private readonly http = inject(HttpClient);

  constructor() {
    console.log('[TelegramNotificationService] 📱 Service initialized');
    if (!this.config.botToken || !this.config.chatId) {
      console.warn('[TelegramNotificationService] ⚠️ Bot token or chat ID not configured');
    }
  }

  /**
   * Check if Telegram is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.botToken && this.config.chatId);
  }

  /**
   * Send a formatted notification
   */
  async sendNotification(notification: TelegramNotification): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[TelegramNotificationService] Telegram not configured, skipping notification');
      return;
    }

    try {
      const message = this._formatNotificationMessage(notification);
      await this.sendMessage(message);
      console.log('[TelegramNotificationService] ✅ Notification sent successfully');
    } catch (error) {
      // Don't throw - we don't want Telegram errors to affect application flow
      console.error('[TelegramNotificationService] ❌ Failed to send notification:', error);
    }
  }

  /**
   * Send a message to Telegram with full formatting options.
   * 
   * This is the primary mid-level API method for sending messages with
   * configurable options while maintaining safety and error handling.
   * 
   * @param text - The message text to send
   * @param options - Message configuration options
   * @returns Promise resolving to Telegram API response
   * 
   * @example
   * ```typescript
   * // Simple message
   * await service.sendMessage('Hello world!');
   * 
   * // Message with custom formatting
   * await service.sendMessage('*Bold* and _italic_ text', {
   *   parseMode: 'Markdown',
   *   disableWebPagePreview: true
   * });
   * 
   * // Message to different chat
   * await service.sendMessage('Team notification', {
   *   chatId: 'TEAM_CHAT_ID'
   * });
   * ```
   */
  async sendMessage(text: string, options: TelegramMessageOptions = {}): Promise<TelegramResponse> {
    if (!this.isConfigured()) {
      throw new Error('Telegram not configured - missing bot token or chat ID');
    }

    const chatId = options.chatId || this.config.chatId;
    const url = `${this.config.apiBaseUrl}${this.config.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || this.config.parseMode,
      disable_web_page_preview: options.disableWebPagePreview ?? this.config.disableWebPagePreview,
      disable_notification: options.disableNotification || false,
      reply_to_message_id: options.replyToMessageId
    };

    console.log('[TelegramNotificationService] 📤 Sending message to chat:', chatId);

    if (this.config.enableRetries) {
      return this._sendWithRetry(url, payload);
    } else {
      return firstValueFrom(this.http.post<TelegramResponse>(url, payload));
    }
  }

  /**
   * Send a test notification to verify configuration
   */
  async sendTestNotification(): Promise<boolean> {
    console.log('[TelegramNotificationService] 🧪 Sending test notification...');

    if (!this.isConfigured()) {
      console.warn('[TelegramNotificationService] ⚠️ Bot token or chat ID not configured');
      return false;
    }

    const testNotification: TelegramNotification = {
      title: 'Test Notification',
      message: 'This is a test notification to verify Telegram integration is working correctly.',
      type: 'info',
      userId: 'test-user-' + Date.now(),
      userDisplayName: 'Test User',
      userEmail: 'test@example.com',
      timestamp: new Date(),
      url: this.platform.isBrowser ? window.location.href : 'https://example.com',
      metadata: {
        testId: Date.now(),
        source: 'TelegramService'
      }
    };

    try {
      await this.sendNotification(testNotification);
      console.log('[TelegramNotificationService] ✅ Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('[TelegramNotificationService] ❌ Test notification failed:', error);
      return false;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<any> {
    if (!this.config.botToken) {
      throw new Error('Bot token not configured');
    }

    const url = `${this.config.apiBaseUrl}${this.config.botToken}/getMe`;
    const response = await firstValueFrom(this.http.get<TelegramResponse>(url));

    if (response.ok) {
      return response.result;
    } else {
      throw new Error(`Telegram API error: ${response.description}`);
    }
  }

  /**
   * Get chat information
   */
  async getChatInfo(chatId?: string): Promise<any> {
    if (!this.config.botToken) {
      throw new Error('Bot token not configured');
    }

    const targetChatId = chatId || this.config.chatId;
    const url = `${this.config.apiBaseUrl}${this.config.botToken}/getChat`;

    const response = await firstValueFrom(
      this.http.post<TelegramResponse>(url, { chat_id: targetChatId })
    );

    if (response.ok) {
      return response.result;
    } else {
      throw new Error(`Telegram API error: ${response.description}`);
    }
  }

  /**
   * Send a formatted message using template variables.
   * 
   * This mid-level API method allows sending messages with variable substitution
   * and automatic escaping for safe content display.
   * 
   * @param template - Message template with {{variable}} placeholders
   * @param options - Template and message options
   * @returns Promise resolving to Telegram API response
   * 
   * @example
   * ```typescript
   * await service.sendFormattedMessage(
   *   'Hello {{name}}! Your order {{orderId}} is {{status}}.',
   *   {
   *     variables: { name: 'John', orderId: '12345', status: 'ready' },
   *     escapeVariables: true,
   *     parseMode: 'Markdown'
   *   }
   * );
   * ```
   */
  async sendFormattedMessage(template: string, options: TelegramTemplateOptions = {}): Promise<TelegramResponse> {
    const { variables = {}, escapeVariables = true, ...messageOptions } = options;
    
    let message = template;
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      let replacement = String(value);
      
      // Apply escaping based on parse mode and escapeVariables setting
      if (escapeVariables) {
        const parseMode = messageOptions.parseMode || this.config.parseMode;
        if (parseMode === 'HTML') {
          replacement = this.escapeHtml(replacement);
        } else if (parseMode === 'Markdown' || parseMode === 'MarkdownV2') {
          replacement = this.escapeMarkdown(replacement);
        }
      }
      
      message = message.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return this.sendMessage(message, messageOptions);
  }

  /**
   * Send a raw message directly to a specific chat with minimal processing.
   * 
   * This low-level API method provides direct access to the Telegram Bot API
   * with minimal abstraction, suitable for advanced use cases.
   * 
   * @param chatId - Target chat ID
   * @param text - Raw message text
   * @param options - Raw message options
   * @returns Promise resolving to Telegram API response
   * 
   * @example
   * ```typescript
   * // Direct message to specific chat
   * await service.sendRawMessage(
   *   '-1001234567890',
   *   '<b>Important:</b> System maintenance in 5 minutes',
   *   { parseMode: 'HTML', disableNotification: true }
   * );
   * ```
   */
  async sendRawMessage(chatId: string, text: string, options: TelegramRawMessageOptions = {}): Promise<TelegramResponse> {
    if (!this.config.botToken) {
      throw new Error('Bot token not configured');
    }

    const url = `${this.config.apiBaseUrl}${this.config.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode,
      disable_web_page_preview: options.disableWebPagePreview,
      disable_notification: options.disableNotification,
      reply_to_message_id: options.replyToMessageId,
      protect_content: options.protectContent,
      allow_sending_without_reply: options.allowSendingWithoutReply
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    console.log('[TelegramNotificationService] 📤 Sending raw message to chat:', chatId);

    if (this.config.enableRetries) {
      return this._sendWithRetry(url, payload);
    } else {
      return firstValueFrom(this.http.post<TelegramResponse>(url, payload));
    }
  }

  // ===================================
  // 🛠️ PUBLIC UTILITY METHODS
  // ===================================
  
  /**
   * Escape special Markdown characters for safe message formatting.
   * 
   * @param text - Text to escape
   * @returns Markdown-escaped text
   * 
   * @example
   * ```typescript
   * const userInput = 'User *input* with [special] chars';
   * const safe = service.escapeMarkdown(userInput);
   * ```
   */
  escapeMarkdown(text: string): string {
    return TelegramUtils.escapeMarkdown(text);
  }

  /**
   * Escape special HTML characters for safe HTML formatting.
   * 
   * @param text - Text to escape
   * @returns HTML-escaped text
   * 
   * @example
   * ```typescript
   * const userInput = 'User <script>alert("xss")</script>';
   * const safe = service.escapeHtml(userInput);
   * ```
   */
  escapeHtml(text: string): string {
    return TelegramUtils.escapeHtml(text);
  }

  /**
   * Parse user agent string into readable device/browser information.
   * 
   * @param userAgent - User agent string
   * @returns Readable device description
   * 
   * @example
   * ```typescript
   * const deviceInfo = service.parseUserAgent(navigator.userAgent);
   * // Result: "Chrome Browser"
   * ```
   */
  parseUserAgent(userAgent: string): string {
    return TelegramUtils.parseUserAgent(userAgent);
  }

  /**
   * Extract path component from URL for cleaner message display.
   * 
   * @param url - Full URL
   * @returns URL path + query + hash
   * 
   * @example
   * ```typescript
   * const path = service.extractPath('https://example.com/api/users?page=1');
   * // Result: "/api/users?page=1"
   * ```
   */
  extractPath(url: string): string {
    return TelegramUtils.extractPath(url);
  }

  /**
   * Format timestamp into localized string.
   * 
   * @param date - Date to format
   * @param locale - Optional locale
   * @param options - Optional formatting options
   * @returns Formatted timestamp
   * 
   * @example
   * ```typescript
   * const formatted = service.formatTimestamp(new Date());
   * ```
   */
  formatTimestamp(date: Date, locale?: string, options?: Intl.DateTimeFormatOptions): string {
    return TelegramUtils.formatTimestamp(date, locale, options);
  }

  /**
   * Format metadata object into readable string.
   * 
   * @param metadata - Metadata object
   * @returns Formatted metadata string
   * 
   * @example
   * ```typescript
   * const meta = service.formatMetadata({ userId: '123', plan: 'premium' });
   * // Result: "user id: 123, plan: premium"
   * ```
   */
  formatMetadata(metadata: Record<string, any>): string {
    return TelegramUtils.formatMetadata(metadata);
  }

  /**
   * Get appropriate emoji for notification type.
   * 
   * @param type - Notification type
   * @returns Corresponding emoji
   * 
   * @example
   * ```typescript
   * const emoji = service.getTypeEmoji('error'); // "❌"
   * ```
   */
  getTypeEmoji(type?: string): string {
    return TelegramUtils.getTypeEmoji(type);
  }

  /**
   * Truncate text to specified length with ellipsis.
   * 
   * @param text - Text to truncate
   * @param maxLength - Maximum length (default: 4096)
   * @param preserveWords - Preserve word boundaries (default: true)
   * @returns Truncated text
   * 
   * @example
   * ```typescript
   * const short = service.truncateText(longMessage, 100);
   * ```
   */
  truncateText(text: string, maxLength?: number, preserveWords?: boolean): string {
    return TelegramUtils.truncateText(text, maxLength, preserveWords);
  }

  // ===================================
  // 🔒 PRIVATE IMPLEMENTATION METHODS
  // ===================================

  private _formatNotificationMessage(notification: TelegramNotification): string {
    const typeEmoji = this._getTypeEmoji(notification.type);
    const title = notification.title || this._getDefaultTitle(notification.type);

    let message = `${typeEmoji} *${this._escapeMarkdown(title)}*\n\n`;

    // User information
    if (notification.userDisplayName) {
      message += `👤 *From:* ${this._escapeMarkdown(notification.userDisplayName)}\n`;
    }

    if (notification.userEmail) {
      message += `📧 *Email:* ${this._escapeMarkdown(notification.userEmail)}\n`;
    }

    if (notification.userId) {
      message += `🆔 *User ID:* ${this._escapeMarkdown(notification.userId)}\n`;
    }

    // Main message
    message += `\n💬 *Message:*\n${this._escapeMarkdown(notification.message)}\n\n`;

    // Additional information
    if (notification.url) {
      message += `🔗 *URL:* ${this._escapeMarkdown(this._extractPath(notification.url))}\n`;
    }

    if (notification.metadata) {
      const metadataString = this._formatMetadata(notification.metadata);
      if (metadataString) {
        message += `📋 *Details:* ${metadataString}\n`;
      }
    }

    // System information
    if (this.platform.isBrowser && notification.additionalInfo) {
      const userAgent = this._parseUserAgent(navigator.userAgent);
      message += `📱 *Device:* ${userAgent}\n`;

      if (notification.additionalInfo['viewport']) {
        const { width, height } = notification.additionalInfo['viewport'];
        message += `📐 *Viewport:* ${width}x${height}\n`;
      }
    }

    // Timestamp
    const timestamp = notification.timestamp || new Date();
    message += `🕐 *Time:* ${timestamp.toLocaleString()}`;

    return message;
  }

  private _getTypeEmoji(type?: string): string {
    return this.getTypeEmoji(type);
  }

  private _getDefaultTitle(type?: string): string {
    const defaultTitles: Record<string, string> = {
      info: 'Information',
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
      bug: 'Bug Report',
      suggestion: 'Suggestion',
      confusion: 'Question',
      security: 'Security Alert',
      performance: 'Performance Issue',
      feature: 'New Feature',
      user: 'User Activity',
      system: 'System Notification'
    };

    return defaultTitles[type || 'info'] || 'Notification';
  }

  private _escapeMarkdown(text: string): string {
    return this.escapeMarkdown(text);
  }

  private _extractPath(url: string): string {
    return this.extractPath(url);
  }

  private _formatMetadata(metadata: Record<string, any>): string {
    return this.formatMetadata(metadata);
  }

  private _parseUserAgent(userAgent: string): string {
    return this.parseUserAgent(userAgent);
  }

  private async _sendWithRetry(url: string, payload: any): Promise<TelegramResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[TelegramNotificationService] Attempt ${attempt}/${this.config.maxRetries}`);
        return await firstValueFrom(this.http.post<TelegramResponse>(url, payload));
      } catch (error: any) {
        lastError = error;
        console.warn(`[TelegramNotificationService] Attempt ${attempt} failed:`, error.message);

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * attempt; // Exponential backoff
          console.log(`[TelegramNotificationService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }
}
