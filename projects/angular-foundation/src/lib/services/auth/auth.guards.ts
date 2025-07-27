import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Simplified interface for authentication service that guards can use
 */
export interface AuthService {
  /** Check if user is authenticated (sync only) */
  isAuthenticated(): boolean;
  
  /** Get current user object (sync only) */
  getCurrentUser(): any | null;
  
  /** Check if user has specific role (optional) */
  hasRole?(role: string): boolean;
  
  /** Check if user has specific permission (optional) */
  hasPermission?(permission: string): boolean;
}

/**
 * Configuration for authentication guards
 */
export interface AuthGuardConfig {
  loginRoute?: string;
  unauthorizedRoute?: string;
  defaultRoute?: string;
}

/**
 * Default guard configuration
 */
export const DEFAULT_AUTH_GUARD_CONFIG: AuthGuardConfig = {
  loginRoute: '/login',
  unauthorizedRoute: '/unauthorized',
  defaultRoute: '/'
};

/**
 * Injection tokens for guard configuration
 */
export const AUTH_SERVICE = new InjectionToken<AuthService>('AUTH_SERVICE');
export const AUTH_GUARD_CONFIG = new InjectionToken<AuthGuardConfig>('AUTH_GUARD_CONFIG');

/**
 * Basic authentication guard - checks if user is authenticated
 * 
 * Usage:
 * ```typescript
 * // In your route configuration
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 * 
 * // In your providers
 * providers: [
 *   { provide: AUTH_SERVICE, useExisting: YourAuthService },
 *   { 
 *     provide: AUTH_GUARD_CONFIG, 
 *     useValue: { loginRoute: '/auth/login' } 
 *   }
 * ]
 * ```
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AUTH_SERVICE);
  const router = inject(Router);
  const config = inject(AUTH_GUARD_CONFIG, { optional: true });
  
  const guardConfig = { ...DEFAULT_AUTH_GUARD_CONFIG, ...config };

  if (authService.isAuthenticated()) {
    return true;
  } else {
    return router.createUrlTree([guardConfig.loginRoute!]);
  }
};

/**
 * Role-based authentication guard factory
 * 
 * Usage:
 * ```typescript
 * // Require any of the specified roles
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [roleGuard(['Admin', 'Moderator'])]
 * }
 * 
 * // Require all specified roles
 * {
 *   path: 'super-admin',
 *   component: SuperAdminComponent,
 *   canActivate: [roleGuard(['Admin', 'SuperUser'], { requireAll: true })]
 * }
 * ```
 */
export const roleGuard = (
  requiredRoles: string[],
  options?: {
    requireAll?: boolean; // require all roles vs any role (default: false)
    loginRoute?: string;
    unauthorizedRoute?: string;
  }
): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AUTH_SERVICE);
    const router = inject(Router);
    const config = inject(AUTH_GUARD_CONFIG, { optional: true });
    
    const guardConfig = { ...DEFAULT_AUTH_GUARD_CONFIG, ...config, ...options };

    // First check authentication
    if (!authService.isAuthenticated()) {
      return router.createUrlTree([guardConfig.loginRoute!]);
    }

    // Check if auth service supports role checking
    if (!authService.hasRole) {
      console.warn('[roleGuard] AuthService does not implement hasRole method');
      return router.createUrlTree([guardConfig.unauthorizedRoute!]);
    }

    // Check roles
    const requireAll = options?.requireAll ?? false;
    
    if (requireAll) {
      // User must have ALL required roles
      const hasAllRoles = requiredRoles.every(role => authService.hasRole!(role));
      return hasAllRoles ? true : router.createUrlTree([guardConfig.unauthorizedRoute!]);
    } else {
      // User must have ANY of the required roles
      const hasAnyRole = requiredRoles.some(role => authService.hasRole!(role));
      return hasAnyRole ? true : router.createUrlTree([guardConfig.unauthorizedRoute!]);
    }
  };
};

/**
 * Permission-based authentication guard factory
 * 
 * Usage:
 * ```typescript
 * // Require any of the specified permissions
 * {
 *   path: 'users',
 *   component: UserManagementComponent,
 *   canActivate: [permissionGuard(['users.read', 'users.write'])]
 * }
 * 
 * // Require all specified permissions
 * {
 *   path: 'admin-panel',
 *   component: AdminPanelComponent,
 *   canActivate: [permissionGuard(['admin.read', 'admin.write'], { requireAll: true })]
 * }
 * ```
 */
export const permissionGuard = (
  requiredPermissions: string[],
  options?: {
    requireAll?: boolean; // require all permissions vs any permission (default: false)
    loginRoute?: string;
    unauthorizedRoute?: string;
  }
): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AUTH_SERVICE);
    const router = inject(Router);
    const config = inject(AUTH_GUARD_CONFIG, { optional: true });
    
    const guardConfig = { ...DEFAULT_AUTH_GUARD_CONFIG, ...config, ...options };

    // First check authentication
    if (!authService.isAuthenticated()) {
      return router.createUrlTree([guardConfig.loginRoute!]);
    }

    // Check if auth service supports permission checking
    if (!authService.hasPermission) {
      console.warn('[permissionGuard] AuthService does not implement hasPermission method');
      return router.createUrlTree([guardConfig.unauthorizedRoute!]);
    }

    // Check permissions
    const requireAll = options?.requireAll ?? false;
    
    if (requireAll) {
      // User must have ALL required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        authService.hasPermission!(permission)
      );
      return hasAllPermissions ? true : router.createUrlTree([guardConfig.unauthorizedRoute!]);
    } else {
      // User must have ANY of the required permissions
      const hasAnyPermission = requiredPermissions.some(permission => 
        authService.hasPermission!(permission)
      );
      return hasAnyPermission ? true : router.createUrlTree([guardConfig.unauthorizedRoute!]);
    }
  };
};

/**
 * Guest guard - only allows access to unauthenticated users
 * 
 * Usage:
 * ```typescript
 * // Redirect authenticated users away from login page
 * {
 *   path: 'login',
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 * ```
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AUTH_SERVICE);
  const router = inject(Router);
  const config = inject(AUTH_GUARD_CONFIG, { optional: true });
  
  const guardConfig = { ...DEFAULT_AUTH_GUARD_CONFIG, ...config };

  if (!authService.isAuthenticated()) {
    return true;
  } else {
    return router.createUrlTree([guardConfig.defaultRoute!]);
  }
};

/**
 * Utility function to create simple custom guards
 * 
 * Usage:
 * ```typescript
 * const ownerGuard = createSimpleGuard((user, route) => {
 *   const resourceId = route.params['id'];
 *   return user?.id === resourceId;
 * });
 * ```
 */
export function createSimpleGuard(
  checkFn: (user: any | null, route: any, state: any) => boolean,
  options?: AuthGuardConfig
): CanActivateFn {
  return (route, state) => {
    const authService = inject(AUTH_SERVICE);
    const router = inject(Router);
    const config = inject(AUTH_GUARD_CONFIG, { optional: true });
    
    const guardConfig = { ...DEFAULT_AUTH_GUARD_CONFIG, ...config, ...options };

    // Get current user
    const user = authService.getCurrentUser();
    
    // Apply custom check
    const result = checkFn(user, route, state);
    
    if (result) {
      return true;
    } else {
      // If not authenticated, go to login; if authenticated but unauthorized, go to unauthorized page
      const redirectRoute = authService.isAuthenticated() 
        ? guardConfig.unauthorizedRoute! 
        : guardConfig.loginRoute!;
      return router.createUrlTree([redirectRoute]);
    }
  };
}