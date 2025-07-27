import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BaseUser,
  AuthState,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  PasswordResetPayload,
  PasswordChangePayload,
  OAuthProvider,
  AuthError,
  Role,
  Permission
} from './auth.types';

/**
 * Core authentication service contract
 *
 * This interface defines the standard methods that any authentication
 * service should implement to work with the Angular Foundation library.
 */
export interface IAuthService<TUser = BaseUser> {
  // ===================================
  // STATE QUERIES
  // ===================================

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get current user or null if not authenticated
   */
  getUser(): TUser | null;

  /**
   * Get current authentication token
   */
  getToken(): string | null;

  /**
   * Check if authentication is still loading/initializing
   */
  isLoading(): boolean;

  /**
   * Get current authentication error, if any
   */
  getError(): string | null;

  // ===================================
  // AUTHENTICATION ACTIONS
  // ===================================

  /**
   * Login with email and password
   */
  loginWithEmail(payload: LoginPayload): Promise<AuthResponse<TUser>>;

  /**
   * Register new user with email and password
   */
  registerWithEmail(payload: RegisterPayload): Promise<AuthResponse<TUser>>;

  /**
   * Login with OAuth provider
   */
  loginWithOAuth(provider: OAuthProvider): Promise<AuthResponse<TUser>>;

  /**
   * Logout current user
   */
  logout(): Promise<void>;

  /**
   * Send password reset email
   */
  resetPassword(payload: PasswordResetPayload): Promise<void>;

  /**
   * Change user password (requires current password)
   */
  changePassword(payload: PasswordChangePayload): Promise<void>;

  /**
   * Refresh authentication token
   */
  refreshToken(): Promise<string>;

  // ===================================
  // USER PROFILE MANAGEMENT
  // ===================================

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<TUser>): Promise<TUser>;

  /**
   * Send email verification
   */
  sendEmailVerification(): Promise<void>;

  /**
   * Verify user email with code/token
   */
  verifyEmail(code: string): Promise<void>;

  // ===================================
  // OPTIONAL ADVANCED FEATURES
  // ===================================

  /**
   * Check if user has specific role
   */
  hasRole?(role: string): boolean;

  /**
   * Check if user has specific permission
   */
  hasPermission?(permission: string): boolean;

  /**
   * Get user roles
   */
  getUserRoles?(): string[];

  /**
   * Get user permissions
   */
  getUserPermissions?(): string[];
}

/**
 * Reactive authentication service contract using Signals/Observables
 *
 * This interface extends the base contract with reactive patterns
 * for applications that prefer reactive state management.
 */
export interface IReactiveAuthService<TUser = BaseUser> extends IAuthService<TUser> {
  // ===================================
  // REACTIVE STATE QUERIES
  // ===================================

  /**
   * Observable of authentication state
   */
  readonly authState$: Observable<AuthState<TUser>>;

  /**
   * Observable of current user
   */
  readonly user$: Observable<TUser | null>;

  /**
   * Observable of authentication status
   */
  readonly isAuthenticated$: Observable<boolean>;

  /**
   * Observable of loading state
   */
  readonly loading$: Observable<boolean>;

  /**
   * Observable of error state
   */
  readonly error$: Observable<string | null>;

  // ===================================
  // SIGNAL-BASED STATE (Angular 17+)
  // ===================================

  /**
   * Signal of current user
   */
  readonly userSignal?: Signal<TUser | null>;

  /**
   * Signal of authentication status
   */
  readonly isAuthenticatedSignal?: Signal<boolean>;

  /**
   * Signal of loading state
   */
  readonly loadingSignal?: Signal<boolean>;

  /**
   * Signal of error state
   */
  readonly errorSignal?: Signal<string | null>;
}

/**
 * Authentication store contract for complex state management
 *
 * This interface defines methods for stores that manage authentication
 * state with advanced features like persistence, caching, etc.
 */
export interface IAuthStore<TUser = BaseUser> extends IReactiveAuthService<TUser> {
  // ===================================
  // STATE MANAGEMENT
  // ===================================

  /**
   * Initialize the authentication store
   */
  initialize(): Promise<void>;

  /**
   * Clear all authentication state
   */
  clearState(): void;

  /**
   * Persist authentication state to storage
   */
  persistState(): Promise<void>;

  /**
   * Restore authentication state from storage
   */
  restoreState(): Promise<void>;

  // ===================================
  // SESSION MANAGEMENT
  // ===================================

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean;

  /**
   * Extend session expiry
   */
  extendSession(): Promise<void>;

  /**
   * Get session expiry time
   */
  getSessionExpiry(): Date | null;

  // ===================================
  // ADVANCED FEATURES
  // ===================================

  /**
   * Switch user context (for admin impersonation)
   */
  switchUser?(targetUserId: string): Promise<void>;

  /**
   * Return to original user (end impersonation)
   */
  exitUserSwitch?(): Promise<void>;

  /**
   * Get impersonation state
   */
  isImpersonating?(): boolean;
}

/**
 * Role-based access control service contract
 */
export interface IRoleService {
  // ===================================
  // ROLE MANAGEMENT
  // ===================================

  /**
   * Get all available roles
   */
  getRoles(): Promise<Role[]>;

  /**
   * Get role by name
   */
  getRole(roleName: string): Promise<Role | null>;

  /**
   * Check if role exists
   */
  hasRole(roleName: string): Promise<boolean>;

  /**
   * Get user roles
   */
  getUserRoles(userId: string): Promise<string[]>;

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleName: string): Promise<void>;

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleName: string): Promise<void>;

  // ===================================
  // PERMISSION MANAGEMENT
  // ===================================

  /**
   * Get all permissions for a role
   */
  getRolePermissions(roleName: string): Promise<Permission[]>;

  /**
   * Check if role has permission
   */
  roleHasPermission(roleName: string, permission: string): Promise<boolean>;

  /**
   * Get user permissions (from all assigned roles)
   */
  getUserPermissions(userId: string): Promise<Permission[]>;

  /**
   * Check if user has permission
   */
  userHasPermission(userId: string, permission: string): Promise<boolean>;

  // ===================================
  // ROLE HIERARCHY
  // ===================================

  /**
   * Check if role inherits from another role
   */
  roleInheritsFrom?(parentRole: string, childRole: string): Promise<boolean>;

  /**
   * Get role hierarchy
   */
  getRoleHierarchy?(): Promise<Record<string, string[]>>;
}

/**
 * Authentication event types
 */
export enum AuthEvent {
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT_START = 'LOGOUT_START',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  REGISTER_START = 'REGISTER_START',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  REGISTER_FAILURE = 'REGISTER_FAILURE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ROLE_CHANGE = 'ROLE_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE'
}

/**
 * Authentication event data
 */
export interface AuthEventData<TUser = BaseUser> {
  type: AuthEvent;
  user?: TUser | null;
  error?: AuthError;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Authentication event service contract
 */
export interface IAuthEventService<TUser = BaseUser> {
  /**
   * Observable of authentication events
   */
  readonly events$: Observable<AuthEventData<TUser>>;

  /**
   * Emit authentication event
   */
  emit(eventType: AuthEvent, data?: Partial<AuthEventData<TUser>>): void;

  /**
   * Subscribe to specific event type
   */
  on(eventType: AuthEvent): Observable<AuthEventData<TUser>>;

  /**
   * Subscribe to multiple event types
   */
  onAny(eventTypes: AuthEvent[]): Observable<AuthEventData<TUser>>;
}

/**
 * Type guards for authentication contracts
 */
export function isReactiveAuthService<TUser = BaseUser>(
  service: any
): service is IReactiveAuthService<TUser> {
  return service &&
    'authState$' in service &&
    'user$' in service &&
    'isAuthenticated$' in service;
}

export function isAuthStore<TUser = BaseUser>(
  service: any
): service is IAuthStore<TUser> {
  return isReactiveAuthService(service) &&
    'initialize' in service &&
    'clearState' in service &&
    'persistState' in service;
}

export function hasRoleSupport<TUser = BaseUser>(
  service: any
): service is IAuthService<TUser> & { hasRole: (role: string) => boolean } {
  return service && 'hasRole' in service && typeof service.hasRole === 'function';
}

export function hasPermissionSupport<TUser = BaseUser>(
  service: any
): service is IAuthService<TUser> & { hasPermission: (permission: string) => boolean } {
  return service && 'hasPermission' in service && typeof service.hasPermission === 'function';
}
