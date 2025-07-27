import { signal, computed, effect, Injectable, inject, InjectionToken } from '@angular/core';
import { CookieService } from '../cookie';
import { SsrPlatformService } from '../ssr';

/**
 * Theme configuration interface
 */
export interface Theme {
  name: string;
  displayName: string;
  isDark: boolean;
  colors: Record<string, string>;
}

/**
 * Theme store configuration
 */
export interface ThemeStoreConfig {
  themes: Record<string, Theme>;
  defaultTheme: string;
  cookieKey?: string;
  storageKey?: string;
  enableSystemPreference?: boolean;
}

/**
 * Injection token for theme store configuration
 */
export const THEME_STORE_CONFIG = new InjectionToken<ThemeStoreConfig>('THEME_STORE_CONFIG');

/**
 * Default theme configuration
 */
export const DEFAULT_THEMES: Record<string, Theme> = {
  light: {
    name: 'light',
    displayName: 'Light',
    isDark: false,
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  dark: {
    name: 'dark',
    displayName: 'Dark',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#fbbf24',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa'
    }
  }
};

export const DEFAULT_THEME_STORE_CONFIG: ThemeStoreConfig = {
  themes: DEFAULT_THEMES,
  defaultTheme: 'light',
  cookieKey: 'theme',
  storageKey: 'theme',
  enableSystemPreference: true
};

/**
 * Enhanced theme management store for Angular applications.
 * 
 * This service provides comprehensive theme management with:
 * - Multiple theme support with light/dark variants
 * - System preference detection and respect
 * - SSR-safe implementation with proper hydration
 * - Cookie-based persistence across sessions
 * - CSS custom properties generation
 * - DOM class and attribute management
 * - Theme validation and fallbacks
 * - Smart theme toggling
 * 
 * Features:
 * - Signal-based reactive state management
 * - Automatic DOM updates when theme changes
 * - Configurable theme definitions
 * - Legacy theme name mapping
 * - Theme grouping by light/dark
 * - CSS variable generation for styling
 * - System preference integration
 * - Server-side rendering support
 * 
 * Usage:
 * ```typescript
 * // Configure themes
 * const customThemes = {
 *   corporate: {
 *     name: 'corporate',
 *     displayName: 'Corporate',
 *     isDark: false,
 *     colors: {
 *       primary: '#1a365d',
 *       background: '#ffffff',
 *       text: '#2d3748'
 *     }
 *   }
 * };
 * 
 * // In your providers
 * providers: [
 *   {
 *     provide: THEME_STORE_CONFIG,
 *     useValue: {
 *       themes: customThemes,
 *       defaultTheme: 'corporate',
 *       enableSystemPreference: true
 *     }
 *   }
 * ]
 * 
 * // In your component
 * @Component({
 *   template: `
 *     <button (click)="themeStore.toggleTheme()">
 *       {{ themeStore.isDark() ? 'Light' : 'Dark' }} Mode
 *     </button>
 *     
 *     <select (change)="themeStore.setTheme($any($event.target).value)">
 *       @for (theme of themeStore.getAllThemes(); track theme.type) {
 *         <option [value]="theme.type">{{ theme.theme.displayName }}</option>
 *       }
 *     </select>
 *   `
 * })
 * export class ThemeComponent {
 *   readonly themeStore = inject(ThemeStoreService);
 * }
 * ```
 * 
 * CSS Integration:
 * ```css
 * .my-component {
 *   background-color: var(--background);
 *   color: var(--text);
 *   border: 1px solid var(--border);
 * }
 * 
 * [data-theme="dark"] .special-element {
 *   // Dark theme specific styles
 * }
 * 
 * .dark .night-mode-only {
 *   display: block;
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ThemeStoreService {
  private readonly cookieService = inject(CookieService);
  private readonly platform = inject(SsrPlatformService);
  private readonly config: ThemeStoreConfig;

  // Private signals
  private readonly _currentTheme = signal<string>('');
  private readonly _isLoaded = signal(false);

  // Public readonly signals
  readonly currentTheme = this._currentTheme.asReadonly();
  readonly theme = computed(() => this.config.themes[this._currentTheme()] || this.config.themes[this.config.defaultTheme]);
  readonly isLoaded = this._isLoaded.asReadonly();
  readonly isDark = computed(() => this.theme().isDark);
  readonly themeName = computed(() => this.theme().name);
  readonly themeDisplayName = computed(() => this.theme().displayName);

  constructor() {
    const injectedConfig = inject(THEME_STORE_CONFIG, { optional: true });
    this.config = { ...DEFAULT_THEME_STORE_CONFIG, ...injectedConfig };

    // Initialize theme
    this.initializeTheme();

    // Apply theme to DOM whenever it changes
    effect(() => {
      if (this._isLoaded()) {
        this.platform.onlyOnBrowser(() => {
          this.applyThemeToDOM(this.theme());
        });
      }
    });
  }

  // ===================================
  // PUBLIC METHODS
  // ===================================

  /**
   * Set specific theme
   */
  setTheme(themeName: string): void {
    if (!this.config.themes[themeName]) {
      console.warn(`[ThemeStoreService] Unknown theme: ${themeName}`);
      return;
    }

    this._currentTheme.set(themeName);
    this.persistTheme(themeName);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const lightThemes = this.getLightThemes();
    const darkThemes = this.getDarkThemes();

    if (this.isDark()) {
      // Switch to first available light theme
      const lightTheme = lightThemes[0]?.type || this.config.defaultTheme;
      this.setTheme(lightTheme);
    } else {
      // Switch to first available dark theme
      const darkTheme = darkThemes[0]?.type || this.findFirstDarkTheme();
      this.setTheme(darkTheme);
    }
  }

  /**
   * Get all light themes
   */
  getLightThemes(): Array<{ type: string; theme: Theme }> {
    return Object.entries(this.config.themes)
      .filter(([_, theme]) => !theme.isDark)
      .map(([type, theme]) => ({ type, theme }));
  }

  /**
   * Get all dark themes
   */
  getDarkThemes(): Array<{ type: string; theme: Theme }> {
    return Object.entries(this.config.themes)
      .filter(([_, theme]) => theme.isDark)
      .map(([type, theme]) => ({ type, theme }));
  }

  /**
   * Get all available themes
   */
  getAllThemes(): Array<{ type: string; theme: Theme }> {
    return Object.entries(this.config.themes)
      .map(([type, theme]) => ({ type, theme }));
  }

  /**
   * Generate CSS custom properties for current theme
   */
  getCSSVariables(): Record<string, string> {
    const theme = this.theme();
    const variables: Record<string, string> = {};

    // Add all theme colors as CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--${this.kebabCase(key)}`] = value;
    });

    return variables;
  }

  /**
   * Check if system theme preference is supported
   */
  hasSystemThemePreference(): boolean {
    return this.platform.onlyOnBrowser(() => {
      const window = this.platform.getWindow();
      return window?.matchMedia && 
             window.matchMedia('(prefers-color-scheme: dark)').matches !== undefined;
    }) ?? false;
  }

  /**
   * Get system theme preference
   */
  getSystemThemePreference(): 'light' | 'dark' | null {
    if (!this.hasSystemThemePreference()) {
      return null;
    }

    return this.platform.onlyOnBrowser(() => {
      const window = this.platform.getWindow();
      const prefersDark = window?.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }) ?? null;
  }

  /**
   * Reset to default theme
   */
  resetToDefault(): void {
    this.setTheme(this.config.defaultTheme);
  }

  /**
   * Check if theme exists
   */
  hasTheme(themeName: string): boolean {
    return !!this.config.themes[themeName];
  }

  // ===================================
  // PRIVATE METHODS
  // ===================================

  private initializeTheme(): void {
    let initialTheme = this.config.defaultTheme;

    // Check for server-provided theme (SSR)
    // This could be injected via a token if needed
    
    this.platform.onlyOnBrowser(() => {
      // Check cookie first
      const cookieTheme = this.cookieService.getCookie(this.config.cookieKey!);
      if (cookieTheme && this.hasTheme(cookieTheme)) {
        initialTheme = cookieTheme;
      }
      // Check localStorage as fallback
      else if (this.config.storageKey) {
        const storageTheme = localStorage.getItem(this.config.storageKey);
        if (storageTheme && this.hasTheme(storageTheme)) {
          initialTheme = storageTheme;
        }
      }
      // Use system preference if enabled and no saved preference
      else if (this.config.enableSystemPreference && this.hasSystemThemePreference()) {
        const systemPreference = this.getSystemThemePreference();
        const preferredTheme = this.findThemeByPreference(systemPreference);
        if (preferredTheme) {
          initialTheme = preferredTheme;
        }
      }

      this._isLoaded.set(true);
    });

    // Set initial theme
    this._currentTheme.set(initialTheme);

    // Mark as loaded on server
    if (this.platform.isServer) {
      this._isLoaded.set(true);
    }
  }

  private findThemeByPreference(preference: 'light' | 'dark' | null): string | null {
    if (!preference) return null;

    const themes = preference === 'dark' ? this.getDarkThemes() : this.getLightThemes();
    return themes[0]?.type || null;
  }

  private findFirstDarkTheme(): string {
    const darkThemes = this.getDarkThemes();
    return darkThemes[0]?.type || this.config.defaultTheme;
  }

  private persistTheme(themeName: string): void {
    this.platform.onlyOnBrowser(() => {
      // Save to cookie
      if (this.config.cookieKey) {
        this.cookieService.setCookie(this.config.cookieKey, themeName);
      }

      // Save to localStorage
      if (this.config.storageKey) {
        localStorage.setItem(this.config.storageKey, themeName);
      }
    });
  }

  private applyThemeToDOM(theme: Theme): void {
    const document = this.platform.getDocument();
    const root = document?.documentElement;
    if (!root) return;

    // Apply CSS custom properties
    const variables = this.getCSSVariables();
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Remove old theme classes
    const allThemeClasses = Object.keys(this.config.themes).map(t => `theme--${t}`);
    root.classList.remove(...allThemeClasses);

    // Add current theme class
    root.classList.add(`theme--${theme.name}`);

    // Add dark/light mode classes
    root.classList.toggle('dark', theme.isDark);
    root.classList.toggle('light', !theme.isDark);

    // Set data attributes for CSS targeting
    root.setAttribute('data-theme', theme.name);
    root.setAttribute('data-theme-mode', theme.isDark ? 'dark' : 'light');

    // Set color-scheme for native elements
    root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/gi, '')
      .toLowerCase();
  }
}