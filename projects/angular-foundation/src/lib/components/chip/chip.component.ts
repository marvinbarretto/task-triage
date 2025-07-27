import { Component, input, output, computed } from '@angular/core';

/**
 * Chip size options
 */
export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Chip variant options
 */
export type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Generic unstyled chip component for Angular applications.
 * 
 * This component provides a flexible chip/badge UI element with:
 * - Customizable content via slots
 * - Multiple size variants
 * - Color variants for different contexts
 * - Optional close/remove functionality
 * - Click handling with proper accessibility
 * - Icon support for leading/trailing elements
 * - Minimal styling using CSS custom properties
 * 
 * Features:
 * - Content projection for flexible layouts
 * - Keyboard navigation support
 * - ARIA accessibility attributes
 * - Hover and focus states
 * - Optional close button
 * - CSS custom properties for theming
 * - TypeScript-safe event handling
 * 
 * Usage:
 * ```html
 * <!-- Basic chip -->
 * <ff-chip>Basic Chip</ff-chip>
 * 
 * <!-- Chip with variants -->
 * <ff-chip variant="primary" size="lg">Primary Large</ff-chip>
 * <ff-chip variant="success">Success Chip</ff-chip>
 * 
 * <!-- Clickable chip -->
 * <ff-chip 
 *   [clickable]="true" 
 *   (clicked)="handleChipClick()"
 * >
 *   Clickable Chip
 * </ff-chip>
 * 
 * <!-- Chip with close button -->
 * <ff-chip 
 *   [closable]="true" 
 *   (closed)="handleChipClose()"
 * >
 *   Closable Chip
 * </ff-chip>
 * 
 * <!-- Chip with icon -->
 * <ff-chip>
 *   <span slot="leading">🏷️</span>
 *   Tagged Item
 * </ff-chip>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-chip {
 *   --chip-padding: 0.5rem 1rem;
 *   --chip-border-radius: 9999px;
 *   --chip-font-size: 0.875rem;
 *   --chip-background: #f3f4f6;
 *   --chip-color: #374151;
 *   --chip-border: 1px solid transparent;
 * 
 *   // Variant colors
 *   &[data-variant="primary"] {
 *     --chip-background: #3b82f6;
 *     --chip-color: white;
 *   }
 * 
 *   &[data-variant="success"] {
 *     --chip-background: #10b981;
 *     --chip-color: white;
 *   }
 * }
 * ```
 */
@Component({
  selector: 'ff-chip',
  standalone: true,
  template: `
    <div
      class="ff-chip"
      [attr.data-size]="size()"
      [attr.data-variant]="variant()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown)="handleKeydown($event)"
    >
      <div class="ff-chip__content">
        <ng-content></ng-content>
      </div>
      
      @if (closable()) {
        <button
          type="button"
          class="ff-chip__close"
          aria-label="Remove"
          (click)="handleClose($event)"
          (keydown.enter)="handleClose($event)"
          (keydown)="handleCloseKeydown($event)"
        >
          <span class="ff-chip__close-icon" attr.aria-hidden="true">×</span>
        </button>
      }
    </div>
  `,
  styleUrl: './chip.component.scss'
})
export class ChipComponent {
  readonly size = input<ChipSize>('md');
  readonly variant = input<ChipVariant>('default');
  readonly clickable = input<boolean>(false);
  readonly closable = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>();

  readonly clicked = output<void>();
  readonly closed = output<void>();

  readonly isInteractive = computed(() => this.clickable() || this.closable());

  handleClick(): void {
    if (this.disabled()) return;
    
    if (this.clickable()) {
      this.clicked.emit();
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  }

  handleClose(event: Event | KeyboardEvent): void {
    event.stopPropagation();
    
    if (this.disabled()) return;
    
    this.closed.emit();
  }

  handleCloseKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
      this.handleClose(event);
    }
  }
}