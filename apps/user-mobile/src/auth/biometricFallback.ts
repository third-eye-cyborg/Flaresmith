/**
 * Biometric Authentication Fallback (T095)
 * 
 * Provides biometric authentication with graceful fallback to password login.
 * Supports Face ID, Touch ID, and Android biometric authentication.
 * 
 * Features:
 * - Hardware capability detection
 * - Biometric enrollment status check
 * - Fallback to password if biometric unavailable/fails
 * - Configurable retry attempts
 * - Error handling with user-friendly messages
 * 
 * Usage:
 * ```typescript
 * import { BiometricAuth } from './auth/biometricFallback';
 * 
 * // Check if biometric is available
 * const available = await BiometricAuth.isAvailable();
 * 
 * // Authenticate with biometric
 * const result = await BiometricAuth.authenticate();
 * 
 * if (result.success) {
 *   // Biometric auth successful
 * } else if (result.fallback === 'password') {
 *   // Show password login
 * }
 * ```
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricType = 'fingerprint' | 'facialRecognition' | 'iris' | 'none';

export type FallbackType = 'password' | 'none';

export type FallbackReason =
  | 'unavailable' // Hardware not available
  | 'notEnrolled' // No biometric enrolled
  | 'cancelled' // User cancelled
  | 'failed' // Authentication failed
  | 'lockout' // Too many attempts
  | 'systemCancel'; // System cancelled (app backgrounded)

export interface BiometricAuthResult {
  success: boolean;
  fallback?: FallbackType;
  fallbackType?: FallbackType;
  reason?: FallbackReason;
  message?: string;
}

export interface BiometricCapability {
  isAvailable: boolean;
  available: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
  hardwarePresent: boolean;
  hasHardware: boolean;
  type: BiometricType;
  typeName: string;
}

function mapAuthenticationType(value: number): BiometricType {
  switch (value) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facialRecognition';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
    default:
      return 'none';
  }
}

function getTypeDisplayName(type: BiometricType): string {
  switch (type) {
    case 'facialRecognition':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris Recognition';
    default:
      return 'Biometric Authentication';
  }
}

function getPrimaryType(types: BiometricType[]): BiometricType {
  return types.find((type) => type !== 'none') ?? 'none';
}

export class BiometricAuth {
  /**
   * Check biometric hardware and enrollment status
   */
  static async getCapability(): Promise<BiometricCapability> {
    try {
      const hardwarePresent = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypesRaw = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const mappedTypes = supportedTypesRaw.map((value) => mapAuthenticationType(value));
      const types: BiometricType[] = mappedTypes.length ? mappedTypes : ['none'];
      const primaryType = getPrimaryType(types);
      const available = hardwarePresent && isEnrolled;

      return {
        isAvailable: available,
        available,
        isEnrolled,
        supportedTypes: types,
        hardwarePresent,
        hasHardware: hardwarePresent,
        type: primaryType,
        typeName: getTypeDisplayName(primaryType),
      };
    } catch (error) {
      console.error('[BiometricAuth] Failed to get capability:', error);
      return {
        isAvailable: false,
        available: false,
        isEnrolled: false,
        supportedTypes: ['none'],
        hardwarePresent: false,
        hasHardware: false,
        type: 'none',
        typeName: getTypeDisplayName('none'),
      };
    }
  }

  /**
   * Quick check if biometric is available
   */
  static async isAvailable(): Promise<boolean> {
    const capability = await this.getCapability();
    return capability.isAvailable;
  }

  /**
   * Get user-friendly biometric type name
   */
  static getBiometricTypeName(type: BiometricType): string;
  static getBiometricTypeName(): Promise<string>;
  static getBiometricTypeName(type?: BiometricType): string | Promise<string> {
    if (type) {
      return getTypeDisplayName(type);
    }

    return (async () => {
      const capability = await this.getCapability();
      return capability.typeName || getTypeDisplayName('none');
    })();
  }

  /**
   * Authenticate user with biometric
   */
  static async authenticate(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<BiometricAuthResult> {
    try {
      const capability = await this.getCapability();

      if (!capability.hardwarePresent) {
        return {
          success: false,
          fallback: 'password',
          fallbackType: 'password',
          reason: 'unavailable',
          message: 'Biometric hardware not available on this device',
        };
      }

      if (!capability.isEnrolled) {
        return {
          success: false,
          fallback: 'password',
          fallbackType: 'password',
          reason: 'notEnrolled',
          message: 'No biometric credentials enrolled. Please use password login.',
        };
      }

      if (capability.available === false) {
        return {
          success: false,
          fallback: 'password',
          fallbackType: 'password',
          reason: 'unavailable',
          message: 'Biometric authentication is unavailable on this device.',
        };
      }

      const biometricTypeName = capability.typeName;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || `Authenticate with ${biometricTypeName}`,
        cancelLabel: options?.cancelLabel || 'Use Password',
        disableDeviceFallback: options?.disableDeviceFallback ?? false,
      });

      if (result.success) {
        console.log('[BiometricAuth] Authentication successful');
        return { success: true, fallback: 'none', fallbackType: 'none' };
      }

      const errorCode = result.error;
      let reason: FallbackReason = 'failed';
      let message = 'Biometric authentication failed';

      switch (errorCode) {
        case 'user_cancel':
          reason = 'cancelled';
          message = 'Authentication cancelled by user';
          break;
        case 'system_cancel':
          reason = 'systemCancel';
          message = 'Authentication cancelled by system';
          break;
        case 'lockout':
          reason = 'lockout';
          message = 'Too many attempts. Please try again later or use password.';
          break;
        default:
          reason = 'failed';
          message = 'Biometric authentication failed. Please try again or use password.';
      }

      console.warn('[BiometricAuth] Authentication failed:', errorCode);

      return {
        success: false,
        fallback: 'password',
        fallbackType: 'password',
        reason,
        message,
      };
    } catch (error) {
      console.error('[BiometricAuth] Authentication error:', error);
      return {
        success: false,
        fallback: 'password',
        fallbackType: 'password',
        reason: 'failed',
        message: 'Biometric authentication error. Please use password login.',
      };
    }
  }

  /**
   * Authenticate with retry logic
   */
  static async authenticateWithRetry(
    maxAttempts: number = 3,
    options?: {
      promptMessage?: string;
      cancelLabel?: string;
    }
  ): Promise<BiometricAuthResult> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await this.authenticate(options);

      if (result.success) {
        return result;
      }

      // Don't retry if user cancelled or hardware unavailable
      if (
        result.reason === 'cancelled' ||
        result.reason === 'unavailable' ||
        result.reason === 'notEnrolled' ||
        result.reason === 'lockout'
      ) {
        return result;
      }

      // Continue retry for other failures
      if (attempts < maxAttempts) {
        console.log(`[BiometricAuth] Retry attempt ${attempts}/${maxAttempts}`);
      }
    }

    return {
      success: false,
      fallback: 'password',
      fallbackType: 'password',
      reason: 'failed',
      message: 'Maximum biometric authentication attempts reached. Please use password.',
    };
  }

  /**
   * Check if biometric lockout is active
   */
  static isLockedOut(result: BiometricAuthResult): boolean;
  static isLockedOut(): Promise<boolean>;
  static isLockedOut(result?: BiometricAuthResult): boolean | Promise<boolean> {
    if (result) {
      return result.reason === 'lockout';
    }

    return (async () => {
      const outcome = await this.authenticate({
        promptMessage: 'Checking biometric status...',
        disableDeviceFallback: true,
      });

      return outcome.reason === 'lockout';
    })();
  }
}
