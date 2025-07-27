import { Component, input } from '@angular/core';

/**
 * Loading state size options
 */
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Generic unstyled loading state component for Angular applications.
 * 
 * This component provides a loading indicator with spinner and customizable text,
 * using minimal styling and CSS custom properties for complete visual control.
 * 
 * Features:
 * - Customizable loading text
 * - Multiple size variants via CSS custom properties
 * - Accessible with proper ARIA attributes
 * - CSS custom properties for complete theming control
 * - Optional spinner animation
 * - Semantic HTML structure
 * - SSR-safe implementation
 * 
 * Use cases:
 * - Page loading states
 * - Data fetching indicators
 * - Form submission loading
 * - Component loading overlays
 * - Skeleton loading placeholders
 * - Any async operation indicator
 * 
 * Example usage:
 * ```html
 * <!-- Basic loading -->
 * <ff-loading-state></ff-loading-state>
 * 
 * <!-- Custom text -->
 * <ff-loading-state text="Saving your changes..."></ff-loading-state>
 * 
 * <!-- Different sizes -->
 * <ff-loading-state size="sm" text="Loading"></ff-loading-state>
 * <ff-loading-state size="lg" text="Processing"></ff-loading-state>
 * 
 * <!-- Without spinner -->
 * <ff-loading-state [showSpinner]="false" text="Please wait"></ff-loading-state>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-loading-state {
 *   --loading-gap: 0.75rem;
 *   --loading-text-color: #6b7280;
 *   --loading-text-size: 1rem;
 *   --loading-spinner-size: 1.5rem;
 *   --loading-spinner-color: #3b82f6;
 *   --loading-spinner-width: 2px;
 *   --loading-align: center;
 * }
 * ```
 */
@Component({
  selector: 'ff-loading-state',
  standalone: true,
  template: `
    <div 
      class="ff-loading" 
      [attr.data-size]="size()"
      [attr.aria-live]="'polite'"
      [attr.aria-busy]="'true'"
      role="status"
    >
      @if (showSpinner()) {
        <span class="ff-loading__spinner" attr.aria-hidden="true"></span>
      }
      @if (text()) {
        <span class="ff-loading__text">{{ text() }}</span>
      }
    </div>
  `,
  styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  readonly text = input<string>('Loading...');
  readonly size = input<LoadingSize>('md');
  readonly showSpinner = input(true);
}