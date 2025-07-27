import { Component, input, output } from '@angular/core';

/**
 * Error state size options
 */
export type ErrorStateSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Error state severity levels
 */
export type ErrorStateSeverity = 'error' | 'warning' | 'info';

/**
 * Generic unstyled error state component for Angular applications.
 * 
 * This component provides a standardized error display with icon, message,
 * and optional retry functionality, using minimal styling and CSS custom
 * properties for complete visual control.
 * 
 * Features:
 * - Customizable error icon (emoji, text, or icon font classes)
 * - Error message display with proper accessibility
 * - Optional retry button with customizable text
 * - Multiple size variants via CSS custom properties
 * - Severity levels for different error types
 * - Accessible with proper ARIA attributes and semantic markup
 * - CSS custom properties for complete theming control
 * - Event emission for retry handling
 * - SSR-safe implementation
 * 
 * Use cases:
 * - API request failures
 * - Form validation errors
 * - File upload errors
 * - Network connectivity issues
 * - Resource loading failures
 * - Permission denied states
 * - General error handling
 * 
 * Example usage:
 * ```html
 * <!-- Basic error state -->
 * <ff-error-state></ff-error-state>
 * 
 * <!-- Custom error message -->
 * <ff-error-state 
 *   icon="🚫" 
 *   message="Failed to load data"
 * ></ff-error-state>
 * 
 * <!-- With retry functionality -->
 * <ff-error-state 
 *   message="Network request failed"
 *   [showRetry]="true"
 *   retryText="Try Again"
 *   (retry)="handleRetry()"
 * ></ff-error-state>
 * 
 * <!-- Different severities and sizes -->
 * <ff-error-state severity="warning" size="sm"></ff-error-state>
 * <ff-error-state severity="info" size="lg"></ff-error-state>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-error-state {
 *   --error-gap: 0.75rem;
 *   --error-padding: 1rem;
 *   --error-icon-color: #dc2626;
 *   --error-message-color: #374151;
 *   --error-retry-background: #dc2626;
 *   --error-retry-color: white;
 * }
 * ```
 */
@Component({
  selector: 'ff-error-state',
  standalone: true,
  template: `
    <div 
      class="ff-error" 
      [attr.data-size]="size()"
      [attr.data-severity]="severity()"
      [attr.aria-live]="'assertive'"
      role="alert"
    >
      @if (icon()) {
        <span class="ff-error__icon" attr.aria-hidden="true">{{ icon() }}</span>
      }
      <div class="ff-error__content">
        @if (message()) {
          <p class="ff-error__message">{{ message() }}</p>
        }
        @if (showRetry() && retryText()) {
          <button 
            class="ff-error__retry" 
            (click)="onRetry()"
            type="button"
            [attr.aria-label]="'Retry ' + (retryLabel() || 'operation')"
          >
            {{ retryText() }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './error-state.component.scss'
})
export class ErrorStateComponent {
  readonly icon = input<string>('⚠️');
  readonly message = input<string>('An error occurred');
  readonly size = input<ErrorStateSize>('md');
  readonly severity = input<ErrorStateSeverity>('error');
  readonly showRetry = input<boolean>(false);
  readonly retryText = input<string>('Retry');
  readonly retryLabel = input<string>();
  
  readonly retry = output<void>();
  
  onRetry(): void {
    this.retry.emit();
  }
}