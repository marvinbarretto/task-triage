import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Tooltip placement options
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tooltip size options
 */
export type TooltipSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Generic unstyled tooltip component for Angular applications.
 * 
 * This component provides a flexible tooltip system that wraps any content
 * and shows additional information on hover, using minimal styling and CSS
 * custom properties for complete visual control.
 * 
 * Features:
 * - Content projection for wrapping any element
 * - Customizable tooltip text
 * - Multiple placement options (top, bottom, left, right)
 * - Multiple size variants via CSS custom properties
 * - Accessible with proper ARIA attributes
 * - CSS custom properties for complete theming control
 * - Smooth show/hide animations
 * - Responsive design considerations
 * - SSR-safe implementation
 * 
 * Use cases:
 * - Help text for form fields
 * - Additional context for buttons
 * - Definitions for complex terms
 * - Status explanations
 * - Feature descriptions
 * - Navigation hints
 * 
 * Example usage:
 * ```html
 * <!-- Basic tooltip -->
 * <ff-tooltip text="This is helpful information">
 *   <button>Hover me</button>
 * </ff-tooltip>
 * 
 * <!-- Different placements -->
 * <ff-tooltip text="Bottom tooltip" placement="bottom">
 *   <span>Bottom</span>
 * </ff-tooltip>
 * 
 * <ff-tooltip text="Right tooltip" placement="right">
 *   <span>Right</span>
 * </ff-tooltip>
 * 
 * <!-- Different sizes -->
 * <ff-tooltip text="Small tooltip" size="sm">
 *   <button>Small</button>
 * </ff-tooltip>
 * 
 * <!-- Complex content -->
 * <ff-tooltip text="Detailed explanation of this feature">
 *   <div class="feature-card">
 *     <h3>Feature Name</h3>
 *     <p>Feature description</p>
 *   </div>
 * </ff-tooltip>
 * ```
 * 
 * CSS Theming:
 * ```scss
 * ff-tooltip {
 *   --tooltip-background: #374151;
 *   --tooltip-color: white;
 *   --tooltip-border-radius: 0.375rem;
 *   --tooltip-padding: 0.5rem 0.75rem;
 *   --tooltip-font-size: 0.875rem;
 *   --tooltip-z-index: 1000;
 *   --tooltip-arrow-size: 5px;
 * }
 * ```
 */
@Component({
  selector: 'ff-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="ff-tooltip" 
      [attr.data-placement]="placement()"
      [attr.data-size]="size()"
    >
      <div class="ff-tooltip__trigger">
        <ng-content></ng-content>
      </div>
      @if (text()) {
        <div 
          class="ff-tooltip__content"
          [attr.role]="'tooltip'"
          [attr.aria-hidden]="'true'"
        >
          {{ text() }}
          <div class="ff-tooltip__arrow" attr.aria-hidden="true"></div>
        </div>
      }
    </div>
  `,
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  readonly text = input.required<string>();
  readonly placement = input<TooltipPlacement>('top');
  readonly size = input<TooltipSize>('md');
}