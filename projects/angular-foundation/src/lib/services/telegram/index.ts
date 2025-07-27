/**
 * Telegram integration module
 * 
 * Provides comprehensive Telegram Bot API integration for Angular applications
 * with support for notifications, messaging, and utility functions.
 * 
 * @example
 * ```typescript
 * import { TelegramNotificationService, TelegramUtils } from '@fourfold/angular-foundation';
 * 
 * // Service-based usage
 * const telegramService = inject(TelegramNotificationService);
 * await telegramService.sendNotification({
 *   title: 'New User',
 *   message: 'A new user registered',
 *   type: 'info'
 * });
 * 
 * // Utility-based usage
 * const escaped = TelegramUtils.escapeMarkdown(userInput);
 * const deviceInfo = TelegramUtils.parseUserAgent(navigator.userAgent);
 * ```
 */

// Main service exports
export * from './telegram.service';

// Utility class exports
export * from './telegram-utils';