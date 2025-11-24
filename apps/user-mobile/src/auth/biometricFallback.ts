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

export type FallbackReason =
  | 'unavailable' // Hardware not available
  | 'notEnrolled' // No biometric enrolled
  | 'cancelled' // User cancelled
  | 'failed' // Authentication failed
  | 'lockout' // Too many attempts
  | 'systemCancel'; // System cancelled (app backgrounded)

export interface BiometricAuthResult {
  success: boolean;
  fallback?: 'password' | 'none';
  reason?: FallbackReason;
  message?: string;
}

export interface BiometricCapability {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
  hardwarePresent: boolean;
}

export class BiometricAuth {
  /**
   * Check biometric hardware and enrollment status
   */
  static async getCapability(): Promise<BiometricCapability> {
    try {
      const hardwarePresent = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const types: BiometricType[] = supportedTypes.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'facialRecognition';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'none';
        }
      });

      return {
        isAvailable: hardwarePresent && isEnrolled,
        isEnrolled,
        supportedTypes: types,
        hardwarePresent,
      };
    } catch (error) {
      console.error('[BiometricAuth] Failed to get capability:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        hardwarePresent: false,
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
  static async getBiometricTypeName(): Promise<string> {
    const capability = await this.getCapability();

    if (capability.supportedTypes.includes('facialRecognition')) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }

    if (capability.supportedTypes.includes('fingerprint')) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }

    if (capability.supportedTypes.includes('iris')) {
      return 'Iris Recognition';
    }

    return 'Biometric Authentication';
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
      // Check capability first
      const capability = await this.getCapability();

      if (!capability.hardwarePresent) {
        return {
          success: false,
          fallback: 'password',
          reason: 'unavailable',
          message: 'Biometric hardware not available on this device',
        };
      }

      if (!capability.isEnrolled) {
        return {
          success: false,
          fallback: 'password',
          reason: 'notEnrolled',
          message: 'No biometric credentials enrolled. Please use password login.',
        };
      }

      // Attempt authentication
      const biometricTypeName = await this.getBiometricTypeName();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || `Authenticate with ${biometricTypeName}`,
        cancelLabel: options?.cancelLabel || 'Use Password',
        disableDeviceFallback: options?.disableDeviceFallback ?? false,
      });

      if (result.success) {
        console.log('[BiometricAuth] Authentication successful');
        return { success: true };
      }

      // Handle authentication failure
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
        reason,
        message,
      };
    } catch (error) {
      console.error('[BiometricAuth] Authentication error:', error);
      return {
        success: false,
        fallback: 'password',
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
      reason: 'failed',
      message: 'Maximum biometric authentication attempts reached. Please use password.',
    };
  }

  /**
   * Check if biometric lockout is active
   */
  static async isLockedOut(): Promise<boolean> {
    const result = await this.authenticate({
      promptMessage: 'Checking biometric status...',
      disableDeviceFallback: true,
    });

    return result.reason === 'lockout';
  }
}
