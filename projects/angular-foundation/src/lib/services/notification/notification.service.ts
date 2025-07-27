import { Injectable, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';

/**
 * Notification message configuration
 */
export interface Notification {
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  sticky?: boolean;
  timeout?: number;
}

/**
 * Generic notification service for displaying system messages.
 * 
 * This service provides a simple notification system for any Angular application
 * that needs to display temporary or persistent messages to users.
 * 
 * Features:
 * - Multiple notification types (error, success, warning, info)
 * - Sticky notifications that persist until manually dismissed
 * - Timeout-based automatic dismissal
 * - Signal-based reactive state management
 * - Simple message queue management
 * 
 * Use cases:
 * - System error messages and alerts
 * - Success confirmations after user actions
 * - Warning messages for user attention
 * - Informational messages and tips
 * - Form validation feedback
 * - API response notifications
 * 
 * Example usage:
 * ```typescript
 * const notificationService = inject(NotificationService);
 * 
 * // Simple success notification
 * notificationService.success('Operation completed successfully!');
 * 
 * // Error with custom timeout
 * notificationService.error('Something went wrong', 8000);
 * 
 * // Sticky warning that requires manual dismissal
 * notificationService.warning('Please review your settings', undefined, true);
 * 
 * // Info with auto-dismiss
 * notificationService.info('New features available', 5000, false);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly messages$$ = signal<Notification[]>([]);

  readonly messages$ = this.messages$$.asReadonly();

  /**
   * Internal method to create and add a notification
   */
  private push(
    type: Notification['type'],
    message: string,
    sticky = true,
    timeout?: number
  ): void {
    const newMessage: Notification = {
      id: uuid(),
      type,
      message,
      sticky,
      timeout,
    };

    this.messages$$.update((messages) => [...messages, newMessage]);
  }

  /**
   * Display an error notification
   */
  error(message: string, timeout?: number, sticky = true): void {
    this.push('error', message, sticky, timeout);
  }

  /**
   * Display a success notification
   */
  success(message: string, timeout?: number, sticky = true): void {
    this.push('success', message, sticky, timeout);
  }

  /**
   * Display a warning notification
   */
  warning(message: string, timeout?: number, sticky = true): void {
    this.push('warning', message, sticky, timeout);
  }

  /**
   * Display an info notification
   */
  info(message: string, timeout?: number, sticky = true): void {
    this.push('info', message, sticky, timeout);
  }

  /**
   * Dismiss a specific notification by ID
   */
  dismiss(id: string): void {
    this.messages$$.update((messages) =>
      messages.filter((message) => message.id !== id)
    );
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.messages$$.set([]);
  }

  /**
   * Get count of active notifications by type
   */
  getNotificationCount(type?: Notification['type']): number {
    const messages = this.messages$$();
    return type ? messages.filter(m => m.type === type).length : messages.length;
  }

  /**
   * Get count of sticky notifications
   */
  getStickyCount(): number {
    return this.messages$$().filter(m => m.sticky).length;
  }

  /**
   * Check if there are any error notifications
   */
  hasErrors(): boolean {
    return this.messages$$().some(m => m.type === 'error');
  }

  /**
   * Get the most recent notification
   */
  getLatestNotification(): Notification | null {
    const messages = this.messages$$();
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  /**
   * Display a quick success message (auto-dismiss, non-sticky)
   */
  quickSuccess(message: string): void {
    this.success(message, 3000, false);
  }

  /**
   * Display a quick error message (auto-dismiss after longer timeout)
   */
  quickError(message: string): void {
    this.error(message, 5000, false);
  }

  /**
   * Display a persistent error that requires manual dismissal
   */
  persistentError(message: string): void {
    this.error(message, undefined, true);
  }

  /**
   * Display a persistent warning that requires manual dismissal
   */
  persistentWarning(message: string): void {
    this.warning(message, undefined, true);
  }
}