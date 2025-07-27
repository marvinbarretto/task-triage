import { Injectable, inject, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { SsrPlatformService } from '../ssr';

/**
 * Toast notification configuration
 */
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  position: 'corner' | 'center';
  sticky: boolean;
  timeout?: number;
}

/**
 * Generic toast notification service with position and timeout support.
 *
 * This service provides a comprehensive toast notification system for any Angular application
 * that needs to display temporary messages to users.
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Flexible positioning (corner for desktop, center for mobile)
 * - Configurable timeouts with automatic dismissal
 * - Sticky toasts that persist until manually dismissed
 * - SSR-safe implementation using SsrPlatformService
 * - Signal-based reactive state management
 * - Automatic cleanup of timers
 *
 * Use cases:
 * - User feedback after actions (save success, validation errors)
 * - System notifications and alerts
 * - Form submission feedback
 * - API response notifications
 * - Mobile-friendly center notifications
 *
 * Example usage:
 * ```typescript
 * const toastService = inject(ToastService);
 *
 * // Simple success notification
 * toastService.success('Settings saved successfully!');
 *
 * // Error with longer timeout
 * toastService.error('Failed to save changes', 8000);
 *
 * // Sticky warning that requires manual dismissal
 * toastService.warning('Check your internet connection', 0, true);
 *
 * // Mobile-friendly center notification
 * toastService.centerInfo('Welcome to the app!');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly activeTimeouts = new Map<string, number>();
  private readonly platform = inject(SsrPlatformService);

  /**
   * Internal method to create and display a toast
   */
  private push(
    message: string,
    type: Toast['type'],
    position: Toast['position'] = 'corner',
    timeout?: number,
    sticky = false
  ): void {
    const toast: Toast = {
      id: uuid(),
      message,
      type,
      position,
      sticky,
      timeout,
    };

    this._toasts.update((current) => [toast, ...current]);

    if (!sticky && timeout) {
      const win = this.platform.getWindow();
      if (!win) {
        return;
      }

      const timeoutId = win.setTimeout(() => {
        this.dismiss(toast.id);
      }, timeout);

      this.activeTimeouts.set(toast.id, timeoutId);
    }
  }

  // Corner toasts (default, desktop-friendly)

  /**
   * Display a success toast in the corner
   */
  success(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'success', 'corner', timeout, sticky);
  }

  /**
   * Display an error toast in the corner
   */
  error(message: string, timeout = 5000, sticky = false): void {
    this.push(message, 'error', 'corner', timeout, sticky);
  }

  /**
   * Display a warning toast in the corner
   */
  warning(message: string, timeout = 4000, sticky = false): void {
    this.push(message, 'warning', 'corner', timeout, sticky);
  }

  /**
   * Display an info toast in the corner
   */
  info(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'info', 'corner', timeout, sticky);
  }

  // Center toasts (mobile-friendly)

  /**
   * Display a success toast in the center (mobile-friendly)
   */
  centerSuccess(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'success', 'center', timeout, sticky);
  }

  /**
   * Display an error toast in the center (mobile-friendly)
   */
  centerError(message: string, timeout = 5000, sticky = false): void {
    this.push(message, 'error', 'center', timeout, sticky);
  }

  /**
   * Display a warning toast in the center (mobile-friendly)
   */
  centerWarning(message: string, timeout = 4000, sticky = false): void {
    this.push(message, 'warning', 'center', timeout, sticky);
  }

  /**
   * Display an info toast in the center (mobile-friendly)
   */
  centerInfo(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'info', 'center', timeout, sticky);
  }

  /**
   * Dismiss a specific toast by ID
   */
  dismiss(id: string): void {
    if (this.activeTimeouts.has(id)) {
      clearTimeout(this.activeTimeouts.get(id));
      this.activeTimeouts.delete(id);
    }

    this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /**
   * Clear all toasts immediately
   */
  clearAll(): void {
    this.activeTimeouts.forEach((id) => clearTimeout(id));
    this.activeTimeouts.clear();

    this._toasts.set([]);
  }

  /**
   * Get count of active toasts by type
   */
  getToastCount(type?: Toast['type']): number {
    const toasts = this._toasts();
    return type ? toasts.filter(t => t.type === type).length : toasts.length;
  }

  /**
   * Get count of sticky toasts
   */
  getStickyCount(): number {
    return this._toasts().filter(t => t.sticky).length;
  }

  /**
   * Check if there are any error toasts currently displayed
   */
  hasErrors(): boolean {
    return this._toasts().some(t => t.type === 'error');
  }

  /**
   * Display a quick success message with sensible defaults
   */
  quickSuccess(message: string): void {
    this.success(message, 2000);
  }

  /**
   * Display a quick error message with sensible defaults
   */
  quickError(message: string): void {
    this.error(message, 4000);
  }

  /**
   * Display a persistent error that requires manual dismissal
   */
  persistentError(message: string): void {
    this.error(message, 0, true);
  }

  /**
   * Display a persistent warning that requires manual dismissal
   */
  persistentWarning(message: string): void {
    this.warning(message, 0, true);
  }
}
