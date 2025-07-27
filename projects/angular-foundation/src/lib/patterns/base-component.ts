import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  InjectionToken
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SsrPlatformService } from '../services/ssr';
import { ToastService } from '../services/toast';

/**
 * Configuration options for BaseComponent behavior
 */
export interface BaseComponentConfig {
  /** Whether to initialize routing signals (default: true) */
  enableRouting?: boolean;
  /** Whether to initialize toast service integration (default: true) */
  enableToasts?: boolean;
  /** Custom error handler function */
  onError?: (error: Error, componentName: string) => void;
}

/**
 * Default configuration for BaseComponent
 */
export const DEFAULT_BASE_COMPONENT_CONFIG: BaseComponentConfig = {
  enableRouting: true,
  enableToasts: true,
  onError: (error, componentName) => {
    console.error(`[${componentName}] Error:`, error);
  }
};

/**
 * Injection token for BaseComponent configuration
 */
export const BASE_COMPONENT_CONFIG = new InjectionToken<BaseComponentConfig>('BASE_COMPONENT_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_BASE_COMPONENT_CONFIG
});

/**
 * Abstract base component for Angular applications using the Foundation architecture.
 * 
 * This component provides common functionality that most components need:
 * - Reactive state management with Angular signals
 * - Router integration with computed route helpers
 * - Toast service integration for user notifications
 * - Async operation handling with loading states
 * - SSR-safe browser detection and execution
 * - Automatic cleanup and memory management
 * - Error handling and recovery patterns
 * 
 * Features:
 * - Loading and error state management
 * - Toast notification helpers (success, error, info, warning)
 * - Route awareness with computed helpers
 * - Browser-safe execution wrapper
 * - Async operation wrapper with error handling
 * - RxJS integration with automatic cleanup
 * - Type-safe configuration options
 * - Memory leak prevention
 * 
 * Usage:
 * ```typescript
 * @Component({
 *   selector: 'app-user-list',
 *   template: `
 *     @if (loading()) {
 *       <ff-loading-state></ff-loading-state>
 *     } @else if (error()) {
 *       <ff-error-state [message]="error()!" (retry)="loadUsers()"></ff-error-state>
 *     } @else {
 *       <div>{{ users().length }} users loaded</div>
 *     }
 *   `
 * })
 * export class UserListComponent extends BaseComponent {
 *   private readonly userStore = inject(UserStore);
 *   
 *   readonly users = this.userStore.data;
 * 
 *   protected async onInit(): Promise<void> {
 *     await this.loadUsers();
 *   }
 * 
 *   async loadUsers(): Promise<void> {
 *     await this.handleAsync(
 *       () => this.userStore.load(),
 *       { 
 *         successMessage: 'Users loaded successfully',
 *         errorMessage: 'Failed to load users' 
 *       }
 *     );
 *   }
 * }
 * ```
 * 
 * Advanced usage with custom configuration:
 * ```typescript
 * export class CustomComponent extends BaseComponent {
 *   constructor() {
 *     super({
 *       enableRouting: false, // Disable routing if not needed
 *       enableToasts: true,
 *       onError: (error, componentName) => {
 *         this.analytics.track('component_error', { component: componentName, error: error.message });
 *       }
 *     });
 *   }
 * }
 * ```
 */
@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class BaseComponent implements OnInit {
  // 🔧 Universal services
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly platform = inject(SsrPlatformService);
  private readonly toastService? = inject(ToastService, { optional: true });
  private readonly router? = inject(Router, { optional: true });

  // Configuration injection
  private readonly injectedConfig = inject(BASE_COMPONENT_CONFIG, { optional: true });
  private readonly config: Required<BaseComponentConfig>;

  // 📡 Universal component state - clean signal names
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // 🧭 Universal routing signals (optional)
  private readonly currentRoute$? = this.router?.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.url),
    takeUntilDestroyed()
  );

  protected readonly currentRoute? = this.currentRoute$ ? toSignal(this.currentRoute$, {
    initialValue: this.router?.url || '/',
  }) : undefined;

  // ✅ Common routing computeds (only if routing is enabled)
  protected readonly isHomepage? = this.currentRoute ? computed(() => this.currentRoute?.() === '/') : undefined;
  
  protected readonly isOnRoute = this.currentRoute ? 
    (route: string) => computed(() => this.currentRoute?.()?.startsWith(route) ?? false) :
    (route: string) => computed(() => false);

  protected constructor() {
    const defaultConfig: Required<BaseComponentConfig> = {
      enableRouting: true,
      enableToasts: true,
      onError: (error: Error, componentName: string) => {
        this.toastService?.error(`${componentName}: ${error.message}`);
      }
    };
    
    this.config = {
      ...defaultConfig,
      ...(this.injectedConfig || {})
    };
  }

  ngOnInit(): void {
    this.onInit();
  }

  /**
   * Override this instead of ngOnInit for cleaner inheritance
   */
  protected onInit(): void {
    // Override in child components
  }

  /**
   * Browser-safe execution helper
   */
  protected onlyOnBrowser<T>(callback: () => T): T | undefined {
    return this.platform.onlyOnBrowser(callback);
  }

  /**
   * Show success toast (if toast service is available)
   */
  protected showSuccess(message: string): void {
    if (this.config.enableToasts && this.toastService) {
      this.toastService.success(message);
    }
  }

  /**
   * Show error toast and optionally set component error state
   */
  protected showError(message: string, setComponentError = false): void {
    if (this.config.enableToasts && this.toastService) {
      this.toastService.error(message);
    }
    if (setComponentError) {
      this.error.set(message);
    }
  }

  /**
   * Show info toast (if toast service is available)
   */
  protected showInfo(message: string): void {
    if (this.config.enableToasts && this.toastService) {
      this.toastService.info(message);
    }
  }

  /**
   * Show warning toast (if toast service is available)
   */
  protected showWarning(message: string): void {
    if (this.config.enableToasts && this.toastService) {
      this.toastService.warning(message);
    }
  }

  /**
   * Clear component error state
   */
  protected clearError(): void {
    this.error.set(null);
  }

  /**
   * Handle async operations with loading state and error handling
   */
  protected async handleAsync<T>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      setLoadingState?: boolean;
    }
  ): Promise<T | null> {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      setLoadingState = true
    } = options || {};

    try {
      if (setLoadingState) this.loading.set(true);
      this.clearError();

      const result = await operation();

      if (successMessage) {
        this.showSuccess(successMessage);
      }

      return result;
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(error?.message || errorMessage);
      this.config.onError(errorObj, this.constructor.name);
      this.error.set(errorObj.message);
      console.error('[BaseComponent] Operation failed:', error);
      return null;
    } finally {
      if (setLoadingState) this.loading.set(false);
    }
  }

  /**
   * Utility for RxJS operations that should complete on destroy
   */
  protected get untilDestroyed() {
    return takeUntilDestroyed(this.destroyRef);
  }

  /**
   * Navigate to a route (if router is available)
   */
  protected navigate(route: string | string[], extras?: any): Promise<boolean> | null {
    if (!this.router) {
      console.warn('[BaseComponent] Router not available for navigation');
      return null;
    }
    return this.router.navigate(Array.isArray(route) ? route : [route], extras);
  }

  /**
   * Get current route path (if routing is enabled)
   */
  protected getCurrentRoute(): string {
    return this.currentRoute?.() || '/';
  }

  /**
   * Check if currently on a specific route
   */
  protected isCurrentRoute(route: string): boolean {
    return this.getCurrentRoute() === route;
  }

  /**
   * Check if current route starts with a path
   */
  protected routeStartsWith(path: string): boolean {
    return this.getCurrentRoute().startsWith(path);
  }
}