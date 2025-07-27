import { Component, input, output } from '@angular/core';

/**
 * Empty state size options
 */
export type EmptyStateSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Generic unstyled empty state component for Angular applications.
 * 
 * This component provides a standardized empty state display with icon, title,
 * subtitle, and optional action button, using minimal styling and CSS custom
 * properties for complete visual control.
 * 
 * Features:
 * - Customizable icon (emoji, text, or icon font classes)
 * - Title and optional subtitle text
 * - Optional action button with customizable text
 * - Multiple size variants via CSS custom properties
 * - Accessible with proper semantic markup
 * - CSS custom properties for complete theming control
 * - Event emission for action handling
 * - SSR-safe implementation
 * 
 * Use cases:
 * - No search results display
 * - Empty data tables
 * - No notifications states
 * - Empty shopping carts
 * - No content available messages
 * - Onboarding/getting started states
 * 
 * Example usage:
 * ```html
 * <!-- Basic empty state -->
 * <ff-empty-state></ff-empty-state>
 * 
 * <!-- Custom content -->
 * <ff-empty-state 
 *   icon="🔍" 
 *   title="No results found"
 *   subtitle="Try adjusting your search criteria"
 * ></ff-empty-state>
 * 
 * <!-- With action button -->
 * <ff-empty-state 
 *   title="No items yet"
 *   subtitle="Start by adding your first item"
 *   [showAction]="true"
 *   actionText="Add Item"
 *   (action)="addNewItem()"
 * ></ff-empty-state>
 * 
 * <!-- Different sizes -->
 * <ff-empty-state size="sm" title="Empty"></ff-empty-state>
 * <ff-empty-state size="lg" title="No content"></ff-empty-state>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-empty-state {
 *   --empty-gap: 1rem;
 *   --empty-padding: 2rem;
 *   --empty-icon-size: 3rem;
 *   --empty-title-color: #374151;
 *   --empty-title-size: 1.125rem;
 *   --empty-subtitle-color: #6b7280;
 *   --empty-action-background: #3b82f6;
 *   --empty-action-color: white;
 * }
 * ```
 */
@Component({
  selector: 'ff-empty-state',
  standalone: true,
  template: `
    <div 
      class="ff-empty" 
      [attr.data-size]="size()"
      role="status"
      [attr.aria-label]="title() || 'Empty state'"
    >
      @if (icon()) {
        <span class="ff-empty__icon" attr.aria-hidden="true">{{ icon() }}</span>
      }
      <div class="ff-empty__content">
        @if (title()) {
          <p class="ff-empty__title">{{ title() }}</p>
        }
        @if (subtitle()) {
          <p class="ff-empty__subtitle">{{ subtitle() }}</p>
        }
        @if (showAction() && actionText()) {
          <button 
            class="ff-empty__action" 
            (click)="onAction()"
            type="button"
            [attr.aria-label]="actionLabel() || actionText()"
          >
            {{ actionText() }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  readonly icon = input<string>('📭');
  readonly title = input<string>('No items found');
  readonly subtitle = input<string>();
  readonly size = input<EmptyStateSize>('md');
  readonly showAction = input<boolean>(false);
  readonly actionText = input<string>('Get Started');
  readonly actionLabel = input<string>();
  
  readonly action = output<void>();
  
  onAction(): void {
    this.action.emit();
  }
}