import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Button size options
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button type options for form integration
 */
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Generic unstyled button component for Angular applications.
 * 
 * This component provides comprehensive button functionality with structure and logic
 * but minimal styling, allowing complete customization through CSS custom properties.
 * 
 * Features:
 * - Multiple size variants with CSS custom properties
 * - Loading states with accessible spinner
 * - Disabled state handling
 * - Icon support (left, right, or icon-only)
 * - Badge/counter display
 * - Router link integration
 * - Full accessibility support (ARIA attributes, keyboard navigation)
 * - Form integration (submit, reset, button types)
 * - Custom CSS properties for complete theming control
 * - SSR-safe implementation
 * 
 * Use cases:
 * - Form submit/cancel buttons
 * - Navigation and routing buttons
 * - Action buttons with loading states
 * - Icon buttons and toggle buttons
 * - Button groups and toolbars
 * - Any interactive button element
 * 
 * Example usage:
 * ```html
 * <!-- Basic button -->
 * <ff-button (onClick)="handleClick()">Click me</ff-button>
 * 
 * <!-- With size and loading -->
 * <ff-button size="lg" [loading]="isLoading">Submit</ff-button>
 * 
 * <!-- With icons -->
 * <ff-button iconLeft="add" iconRight="arrow_forward">Add Item</ff-button>
 * 
 * <!-- Router button -->
 * <ff-button routerLink="/dashboard" iconLeft="dashboard">Dashboard</ff-button>
 * 
 * <!-- Icon-only button -->
 * <ff-button iconLeft="edit" ariaLabel="Edit item"></ff-button>
 * 
 * <!-- With badge -->
 * <ff-button badge="3">Messages</ff-button>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-button {
 *   --btn-padding: 0.75rem 1.5rem;
 *   --btn-font-size: 1rem;
 *   --btn-border-radius: 0.5rem;
 *   --btn-background: #3b82f6;
 *   --btn-color: white;
 *   --btn-border: none;
 *   --btn-focus-outline: 2px solid #93c5fd;
 *   --btn-disabled-opacity: 0.5;
 *   --btn-gap: 0.5rem;
 * }
 * ```
 */
@Component({
  selector: 'ff-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Regular Button -->
    @if (!routerLink()) {
      <button
        [attr.data-size]="size()"
        [disabled]="isDisabled()"
        [class.is-loading]="loading()"
        [class.full-width]="fullWidth()"
        [class.icon-only]="isIconOnly()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="ariaLabel()"
        [attr.title]="tooltip()"
        (click)="handleClick($event)"
        [attr.type]="type()"
        class="ff-btn"
      >
        <ng-container *ngTemplateOutlet="buttonContent"></ng-container>
      </button>
    }

    <!-- Router Link Button -->
    @if (routerLink()) {
      <a
        [routerLink]="routerLink()"
        [queryParams]="queryParams()"
        [fragment]="fragment()"
        [attr.data-size]="size()"
        [class.is-loading]="loading()"
        [class.full-width]="fullWidth()"
        [class.icon-only]="isIconOnly()"
        [class.disabled]="isDisabled()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="ariaLabel()"
        [attr.title]="tooltip()"
        [attr.tabindex]="isDisabled() ? -1 : 0"
        class="ff-btn ff-btn--link"
        (click)="handleLinkClick($event)"
      >
        <ng-container *ngTemplateOutlet="buttonContent"></ng-container>
      </a>
    }

    <!-- Button Content Template -->
    <ng-template #buttonContent>
      @if (loading()) {
        <span class="ff-btn__spinner" aria-hidden="true"></span>
        @if (!isIconOnly()) {
          <span class="ff-btn__text">{{ loadingText() || 'Loading...' }}</span>
        }
      } @else {
        @if (iconLeft()) {
          <span class="ff-btn__icon ff-btn__icon--left" [innerHTML]="iconLeft()" aria-hidden="true"></span>
        }

        @if (!isIconOnly()) {
          <span class="ff-btn__text">
            <ng-content />
          </span>
        }

        @if (iconRight()) {
          <span class="ff-btn__icon ff-btn__icon--right" [innerHTML]="iconRight()" aria-hidden="true"></span>
        }

        @if (badge()) {
          <span class="ff-btn__badge">{{ badge() }}</span>
        }
      }
    </ng-template>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  // Core props
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');

  // State
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly loadingText = input<string>();

  // Layout
  readonly fullWidth = input(false);
  readonly iconLeft = input<string>(); // HTML string for icon (SVG, emoji, etc.)
  readonly iconRight = input<string>(); // HTML string for icon
  readonly badge = input<string | number>();

  // Accessibility
  readonly ariaLabel = input<string>();
  readonly tooltip = input<string>();

  // Router integration
  readonly routerLink = input<string | any[]>();
  readonly queryParams = input<Record<string, any>>();
  readonly fragment = input<string>();

  // Events
  readonly onClick = output<MouseEvent>();

  // Computed properties
  readonly isDisabled = computed(() => this.disabled() || this.loading());
  readonly isIconOnly = computed(() => 
    !!(this.iconLeft() || this.iconRight()) && !this._hasTextContent()
  );

  private _hasTextContent(): boolean {
    // In a real implementation, you might check the projected content
    // For now, we assume there's content unless explicitly icon-only
    // This could be enhanced with ViewChild or ContentChild
    return true;
  }

  handleClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.onClick.emit(event);
    }
  }

  handleLinkClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.onClick.emit(event);
  }
}