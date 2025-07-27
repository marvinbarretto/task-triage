import { inject, Injectable, signal, InjectionToken } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Default breakpoint configuration
 */
export const DEFAULT_BREAKPOINTS = {
  MOBILE_MAX: 767,      // Mobile: 0-767px
  TABLET_MIN: 768,      // Tablet: 768-1023px
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024,    // Desktop: 1024px+
  LARGE_DESKTOP_MIN: 1440,  // Large desktop: 1440px+
  EXTRA_LARGE_MIN: 1920     // Extra large: 1920px+
} as const;

/**
 * Breakpoint configuration interface
 */
export interface BreakpointConfig {
  MOBILE_MAX: number;
  TABLET_MIN: number;
  TABLET_MAX: number;
  DESKTOP_MIN: number;
  LARGE_DESKTOP_MIN: number;
  EXTRA_LARGE_MIN: number;
}

/**
 * Injection token for breakpoint configuration
 */
export const VIEWPORT_BREAKPOINTS = new InjectionToken<BreakpointConfig>('VIEWPORT_BREAKPOINTS', {
  providedIn: 'root',
  factory: () => DEFAULT_BREAKPOINTS
});

/**
 * Viewport information interface
 */
export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isExtraLarge: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
}

/**
 * Generic viewport detection service with configurable breakpoints.
 *
 * This service provides responsive design utilities for any Angular application
 * that needs to adapt to different screen sizes and device types.
 *
 * Features:
 * - Configurable breakpoints via dependency injection
 * - SSR-safe implementation using SsrPlatformService
 * - Signal-based reactive state management
 * - Multiple device type detection (mobile, tablet, desktop, etc.)
 * - Viewport dimension tracking
 * - Orientation detection
 * - Device pixel ratio detection
 * - Automatic resize event handling
 *
 * Use cases:
 * - Responsive component behavior
 * - Conditional rendering for different screen sizes
 * - Mobile-first design implementations
 * - Dynamic layout adjustments
 * - Performance optimizations based on device type
 *
 * Example usage:
 * ```typescript
 * const viewportService = inject(ViewportService);
 *
 * // Simple mobile detection
 * const isMobile = viewportService.isMobile();
 *
 * // Get complete viewport information
 * const viewport = viewportService.getViewportInfo();
 * console.log(viewport.width, viewport.orientation);
 *
 * // Custom breakpoints
 * providers: [
 *   {
 *     provide: VIEWPORT_BREAKPOINTS,
 *     useValue: {
 *       MOBILE_MAX: 600,
 *       TABLET_MIN: 601,
 *       TABLET_MAX: 900,
 *       DESKTOP_MIN: 901,
 *       LARGE_DESKTOP_MIN: 1200,
 *       EXTRA_LARGE_MIN: 1600
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly platform = inject(SsrPlatformService);
  private readonly breakpoints = inject(VIEWPORT_BREAKPOINTS);

  // Reactive signals
  readonly isMobile = signal(false);
  readonly isTablet = signal(false);
  readonly isDesktop = signal(false);
  readonly isLargeDesktop = signal(false);
  readonly isExtraLarge = signal(false);
  readonly viewportWidth = signal(0);
  readonly viewportHeight = signal(0);
  readonly orientation = signal<'portrait' | 'landscape'>('portrait');

  constructor() {
    if (this.platform.isServer) return;

    // Initial check
    this.updateViewport();

    // Listen for resize events
    const win = this.platform.getWindow();
    if (win) {
      win.addEventListener('resize', () => this.updateViewport());
      win.addEventListener('orientationchange', () => {
        // Small delay to get accurate dimensions after orientation change
        setTimeout(() => this.updateViewport(), 100);
      });
    }
  }

  /**
   * Update all viewport-related signals
   */
  private updateViewport(): void {
    const win = this.platform.getWindow();
    if (!win) return;

    const width = win.innerWidth;
    const height = win.innerHeight;

    // Update dimensions
    this.viewportWidth.set(width);
    this.viewportHeight.set(height);

    // Update device type flags
    this.isMobile.set(width <= this.breakpoints.MOBILE_MAX);
    this.isTablet.set(width >= this.breakpoints.TABLET_MIN && width <= this.breakpoints.TABLET_MAX);
    this.isDesktop.set(width >= this.breakpoints.DESKTOP_MIN && width < this.breakpoints.LARGE_DESKTOP_MIN);
    this.isLargeDesktop.set(width >= this.breakpoints.LARGE_DESKTOP_MIN && width < this.breakpoints.EXTRA_LARGE_MIN);
    this.isExtraLarge.set(width >= this.breakpoints.EXTRA_LARGE_MIN);

    // Update orientation
    this.orientation.set(width > height ? 'landscape' : 'portrait');
  }

  /**
   * Get complete viewport information
   */
  getViewportInfo(): ViewportInfo {
    const win = this.platform.getWindow();

    return {
      width: this.viewportWidth(),
      height: this.viewportHeight(),
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      isLargeDesktop: this.isLargeDesktop(),
      isExtraLarge: this.isExtraLarge(),
      orientation: this.orientation(),
      devicePixelRatio: win?.devicePixelRatio || 1
    };
  }

  /**
   * Check if viewport matches a specific breakpoint
   */
  matches(breakpoint: keyof BreakpointConfig): boolean {
    const width = this.viewportWidth();
    const value = this.breakpoints[breakpoint];

    switch (breakpoint) {
      case 'MOBILE_MAX':
        return width <= value;
      case 'TABLET_MIN':
      case 'DESKTOP_MIN':
      case 'LARGE_DESKTOP_MIN':
      case 'EXTRA_LARGE_MIN':
        return width >= value;
      case 'TABLET_MAX':
        return width <= value;
      default:
        return false;
    }
  }

  /**
   * Check if viewport is between two breakpoints
   */
  matchesRange(minBreakpoint: keyof BreakpointConfig, maxBreakpoint: keyof BreakpointConfig): boolean {
    const width = this.viewportWidth();
    const minValue = this.breakpoints[minBreakpoint];
    const maxValue = this.breakpoints[maxBreakpoint];

    return width >= minValue && width <= maxValue;
  }

  /**
   * Get current device type as string
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'large-desktop' | 'extra-large' {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    if (this.isDesktop()) return 'desktop';
    if (this.isLargeDesktop()) return 'large-desktop';
    return 'extra-large';
  }

  /**
   * Check if viewport is in portrait mode
   */
  isPortrait(): boolean {
    return this.orientation() === 'portrait';
  }

  /**
   * Check if viewport is in landscape mode
   */
  isLandscape(): boolean {
    return this.orientation() === 'landscape';
  }

  /**
   * Check if device has high DPI display
   */
  isHighDPI(): boolean {
    const win = this.platform.getWindow();
    return (win?.devicePixelRatio || 1) > 1;
  }

  /**
   * Get viewport aspect ratio
   */
  getAspectRatio(): number {
    const width = this.viewportWidth();
    const height = this.viewportHeight();
    return height > 0 ? width / height : 0;
  }
}
