/**
 * Generic authentication types and interfaces for Angular Foundation
 */

/**
 * Generic user roles enum - applications can extend this
 */
export enum BaseRoles {
  Admin = 'Admin',
  Authenticated = 'Authenticated',
  Public = 'Public'
}

/**
 * Base user interface - applications should extend this
 */
export interface BaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role?: string;
  joinedAt: string;
}

/**
 * Authentication response interface
 */
export interface AuthResponse<TUser = BaseUser> {
  user: TUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Login payload interface
 */
export interface LoginPayload {
  identifier: string; // email or username
  password: string;
}

/**
 * Registration payload interface
 */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
  additionalData?: Record<string, any>;
}

/**
 * Registration form interface (includes confirm password)
 */
export interface RegisterForm extends RegisterPayload {
  confirmPassword: string;
}

/**
 * Password reset payload
 */
export interface PasswordResetPayload {
  email: string;
}

/**
 * Password change payload
 */
export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'facebook' | 'twitter' | 'github' | 'microsoft';

/**
 * Authentication state
 */
export interface AuthState<TUser = BaseUser> {
  user: TUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  enableRememberMe?: boolean;
  tokenStorageKey?: string;
  userStorageKey?: string;
  redirectAfterLogin?: string;
  redirectAfterLogout?: string;
  autoRefreshToken?: boolean;
  tokenRefreshThreshold?: number; // minutes before expiry
}

/**
 * Permission interface for role-based access control
 */
export interface Permission {
  resource: string;
  action: string;
}

/**
 * Role interface with permissions
 */
export interface Role {
  name: string;
  permissions: Permission[];
  priority: number; // higher number = higher priority
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
}

/**
 * Social login configuration
 */
export interface SocialLoginConfig {
  provider: OAuthProvider;
  clientId?: string;
  redirectUri?: string;
  scope?: string[];
  additionalParams?: Record<string, string>;
}