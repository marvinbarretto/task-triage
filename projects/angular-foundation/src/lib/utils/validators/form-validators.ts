import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Generic form validation utilities for Angular applications.
 * 
 * This utility class provides comprehensive form validation functions
 * with consistent error handling and user-friendly error messages.
 * 
 * Features:
 * - Password strength validation with customizable requirements
 * - Password matching validation for confirm password fields
 * - Display name validation with character restrictions
 * - User-friendly error message generation
 * - Password strength scoring and labeling
 * - Form builder helpers for common patterns
 * 
 * Use cases:
 * - User registration and authentication forms
 * - Profile management and settings forms
 * - Account security and password change forms
 * - Generic form validation across applications
 * - Consistent validation rules and error messages
 * 
 * Example usage:
 * ```typescript
 * import { FormValidators } from 'angular-foundation';
 * 
 * // In component
 * registrationForm = this.fb.group({
 *   email: ['', [Validators.required, Validators.email]],
 *   password: ['', [Validators.required, FormValidators.passwordStrength()]],
 *   confirmPassword: ['', [Validators.required]],
 *   displayName: ['', [Validators.required, FormValidators.displayName()]]
 * }, {
 *   validators: FormValidators.passwordMatch('password', 'confirmPassword')
 * });
 * 
 * // Get password strength
 * const strength = FormValidators.getPasswordStrength(password);
 * console.log(strength.label); // 'Weak', 'Medium', 'Strong'
 * 
 * // Get user-friendly error messages
 * const error = FormValidators.getErrorMessage('password', control.errors);
 * ```
 */
export class FormValidators {
  
  /**
   * Validates that passwords match
   */
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField);
      const confirmPassword = control.get(confirmPasswordField);
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  /**
   * Validates password strength with customizable requirements
   */
  static passwordStrength(options: PasswordStrengthOptions = {}): ValidatorFn {
    const defaultOptions: Required<PasswordStrengthOptions> = {
      minLength: 8,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: true,
      requireSpecialChars: true,
      minRequirements: 3
    };
    
    const config = { ...defaultOptions, ...options };
    
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }

      const checks = [
        value.length >= config.minLength,
        !config.requireNumbers || /[0-9]/.test(value),
        !config.requireUppercase || /[A-Z]/.test(value),
        !config.requireLowercase || /[a-z]/.test(value),
        !config.requireSpecialChars || /[^A-Za-z0-9]/.test(value)
      ];

      const passedChecks = checks.filter(Boolean).length;

      if (passedChecks < config.minRequirements) {
        return { 
          weakPassword: {
            requirements: config,
            passedChecks,
            requiredChecks: config.minRequirements
          }
        };
      }

      return null;
    };
  }

  /**
   * Validates display name format
   */
  static displayName(options: DisplayNameOptions = {}): ValidatorFn {
    const defaultOptions: Required<DisplayNameOptions> = {
      allowedPattern: /^[a-zA-Z0-9\s\-_'.]+$/,
      minLength: 2,
      maxLength: 50,
      allowConsecutiveSpaces: false,
      trimWhitespace: true
    };
    
    const config = { ...defaultOptions, ...options };
    
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }

      // Length checks
      if (value.length < config.minLength) {
        return { minlength: { requiredLength: config.minLength, actualLength: value.length } };
      }
      
      if (value.length > config.maxLength) {
        return { maxlength: { requiredLength: config.maxLength, actualLength: value.length } };
      }

      // Pattern check
      if (!config.allowedPattern.test(value)) {
        return { invalidDisplayName: { reason: 'invalid_characters' } };
      }

      // Consecutive spaces check
      if (!config.allowConsecutiveSpaces && /\s{2,}/.test(value)) {
        return { invalidDisplayName: { reason: 'consecutive_spaces' } };
      }

      // Whitespace trimming check
      if (config.trimWhitespace && value.trim() !== value) {
        return { invalidDisplayName: { reason: 'leading_trailing_spaces' } };
      }

      return null;
    };
  }

  /**
   * Validates email format with additional checks
   */
  static email(options: EmailOptions = {}): ValidatorFn {
    const defaultOptions: Required<EmailOptions> = {
      allowedDomains: [],
      blockedDomains: [],
      requireTLD: true,
      maxLength: 254
    };
    
    const config = { ...defaultOptions, ...options };
    
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }

      // Basic email pattern
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(value)) {
        return { email: { reason: 'invalid_format' } };
      }

      // Length check
      if (value.length > config.maxLength) {
        return { email: { reason: 'too_long', maxLength: config.maxLength } };
      }

      // Domain validation
      const domain = value.split('@')[1]?.toLowerCase();
      
      if (config.allowedDomains.length > 0 && !config.allowedDomains.includes(domain)) {
        return { email: { reason: 'domain_not_allowed', domain } };
      }
      
      if (config.blockedDomains.includes(domain)) {
        return { email: { reason: 'domain_blocked', domain } };
      }

      // TLD requirement
      if (config.requireTLD && !domain.includes('.')) {
        return { email: { reason: 'missing_tld' } };
      }

      return null;
    };
  }

  /**
   * Gets password strength score and label
   */
  static getPasswordStrength(password: string): PasswordStrength {
    if (!password) {
      return { score: 0, label: 'None', percentage: 0, feedback: [] };
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      longLength: password.length >= 12
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback: string[] = [];

    // Generate feedback
    if (!checks.length) feedback.push('Use at least 8 characters');
    if (!checks.uppercase) feedback.push('Add uppercase letters');
    if (!checks.lowercase) feedback.push('Add lowercase letters');
    if (!checks.numbers) feedback.push('Add numbers');
    if (!checks.special) feedback.push('Add special characters');
    if (!checks.longLength && score >= 4) feedback.push('Use 12+ characters for better security');

    if (score < 2) {
      return { score, label: 'Very Weak', percentage: 20, feedback };
    } else if (score < 3) {
      return { score, label: 'Weak', percentage: 40, feedback };
    } else if (score < 4) {
      return { score, label: 'Fair', percentage: 60, feedback };
    } else if (score < 5) {
      return { score, label: 'Good', percentage: 80, feedback };
    } else {
      return { score, label: 'Strong', percentage: 100, feedback: [] };
    }
  }

  /**
   * Gets user-friendly error messages
   */
  static getErrorMessage(controlName: string, errors: ValidationErrors): string {
    const errorKey = Object.keys(errors)[0];
    const errorValue = errors[errorKey];

    switch (errorKey) {
      case 'required':
        return `${this._getFieldDisplayName(controlName)} is required`;
      
      case 'email':
        if (errorValue?.reason === 'domain_not_allowed') {
          return 'Email domain is not allowed';
        }
        if (errorValue?.reason === 'domain_blocked') {
          return 'Email domain is not permitted';
        }
        return 'Please enter a valid email address';
      
      case 'minlength':
        return `${this._getFieldDisplayName(controlName)} must be at least ${errorValue.requiredLength} characters`;
      
      case 'maxlength':
        return `${this._getFieldDisplayName(controlName)} must be less than ${errorValue.requiredLength} characters`;
      
      case 'passwordMismatch':
        return 'Passwords do not match';
      
      case 'weakPassword':
        return 'Password is too weak. Use a mix of letters, numbers, and symbols';
      
      case 'invalidDisplayName':
        if (errorValue?.reason === 'consecutive_spaces') {
          return 'Display name cannot contain consecutive spaces';
        }
        if (errorValue?.reason === 'leading_trailing_spaces') {
          return 'Display name cannot start or end with spaces';
        }
        return 'Display name contains invalid characters';
      
      default:
        return `${this._getFieldDisplayName(controlName)} is invalid`;
    }
  }

  /**
   * Converts control names to user-friendly display names
   */
  private static _getFieldDisplayName(controlName: string): string {
    const displayNames: Record<string, string> = {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      displayName: 'Display Name',
      firstName: 'First Name',
      lastName: 'Last Name',
      username: 'Username',
      phoneNumber: 'Phone Number',
      address: 'Address',
      city: 'City',
      zipCode: 'ZIP Code',
      country: 'Country'
    };

    return displayNames[controlName] || 
           controlName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }
}

/**
 * Password strength configuration options
 */
export interface PasswordStrengthOptions {
  minLength?: number;
  requireNumbers?: boolean;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireSpecialChars?: boolean;
  minRequirements?: number;
}

/**
 * Display name validation options
 */
export interface DisplayNameOptions {
  allowedPattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  allowConsecutiveSpaces?: boolean;
  trimWhitespace?: boolean;
}

/**
 * Email validation options
 */
export interface EmailOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireTLD?: boolean;
  maxLength?: number;
}

/**
 * Password strength result
 */
export interface PasswordStrength {
  score: number;
  label: 'None' | 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  percentage: number;
  feedback: string[];
}

/**
 * Utility function to create reactive forms with common validation patterns
 */
export interface FormFieldConfig {
  value?: any;
  validators?: ValidatorFn[];
  disabled?: boolean;
}

export interface AuthFormConfig {
  email?: FormFieldConfig;
  password?: FormFieldConfig;
  confirmPassword?: FormFieldConfig;
  displayName?: FormFieldConfig;
}

/**
 * Form builder helper for common form patterns
 */
export class FormBuilderHelper {
  static createAuthForm(config: AuthFormConfig = {}) {
    return {
      email: [
        config.email?.value || '',
        config.email?.validators || []
      ],
      password: [
        config.password?.value || '',
        config.password?.validators || []
      ],
      ...(config.confirmPassword && {
        confirmPassword: [
          config.confirmPassword.value || '',
          config.confirmPassword.validators || []
        ]
      }),
      ...(config.displayName && {
        displayName: [
          config.displayName.value || '',
          config.displayName.validators || []
        ]
      })
    };
  }
}