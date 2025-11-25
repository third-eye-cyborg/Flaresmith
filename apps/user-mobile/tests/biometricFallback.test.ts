/**
 * Biometric Fallback Tests
 * 
 * Test suite for BiometricAuth class validating:
 * - Hardware capability detection
 * - Enrollment status checks
 * - Authentication flow
 * - Retry logic and max attempts
 * - Fallback scenarios
 * - Lockout detection
 * - User-friendly error messages
 * 
 * Spec: FR-044, FR-045, SC-015 (mobile apps maintain session isolation)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricAuth } from '../src/auth/biometricFallback';
import type { BiometricCapability, BiometricAuthResult } from '../src/auth/biometricFallback';

// Mock expo-local-authentication
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

describe('BiometricAuth', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });
  
  describe('getCapability', () => {
    it('should return unavailable when no hardware', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
      
      const capability: BiometricCapability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(false);
      expect(capability.hasHardware).toBe(false);
      expect(capability.isEnrolled).toBe(false);
      expect(capability.type).toBe('none');
    });
    
    it('should return unavailable when hardware exists but not enrolled', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      
      const capability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(false);
      expect(capability.hasHardware).toBe(true);
      expect(capability.isEnrolled).toBe(false);
      expect(capability.type).toBe('fingerprint');
    });
    
    it('should return available for fingerprint when hardware and enrollment present', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      
      const capability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(true);
      expect(capability.hasHardware).toBe(true);
      expect(capability.isEnrolled).toBe(true);
      expect(capability.type).toBe('fingerprint');
      expect(capability.typeName).toBe('Touch ID');
    });
    
    it('should return available for facial recognition', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]);
      
      const capability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(true);
      expect(capability.type).toBe('facialRecognition');
      expect(capability.typeName).toBe('Face ID');
    });
    
    it('should return available for iris recognition', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.IRIS]);
      
      const capability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(true);
      expect(capability.type).toBe('iris');
      expect(capability.typeName).toBe('Iris Recognition');
    });
    
    it('should handle multiple biometric types', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      
      const capability = await BiometricAuth.getCapability();
      
      expect(capability.available).toBe(true);
      // Should return first available type
      expect(['fingerprint', 'facialRecognition']).toContain(capability.type);
    });
  });
  
  describe('isAvailable', () => {
    it('should return true when biometric is available', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      
      const available = await BiometricAuth.isAvailable();
      
      expect(available).toBe(true);
    });
    
    it('should return false when biometric is unavailable', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
      
      const available = await BiometricAuth.isAvailable();
      
      expect(available).toBe(false);
    });
  });
  
  describe('authenticate', () => {
    it('should return success on successful authentication', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });
      
      const result: BiometricAuthResult = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(true);
      expect(result.fallbackType).toBe('none');
      expect(result.reason).toBeUndefined();
      expect(result.message).toBeUndefined();
    });
    
    it('should return unavailable fallback when no hardware', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('unavailable');
      expect(result.message).toContain('not available');
    });
    
    it('should return notEnrolled fallback when not enrolled', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('notEnrolled');
      expect(result.message).toContain('not set up');
    });
    
    it('should return cancelled fallback when user cancels', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'user_cancel',
      });
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('cancelled');
      expect(result.message).toContain('cancelled');
    });
    
    it('should return failed fallback on authentication failure', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'authentication_failed',
      });
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('failed');
      expect(result.message).toContain('failed');
    });
    
    it('should return lockout fallback on too many attempts', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'lockout',
      });
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('lockout');
      expect(result.message).toContain('locked');
    });
  });
  
  describe('authenticateWithRetry', () => {
    it('should succeed on first attempt', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });
      
      const result = await BiometricAuth.authenticateWithRetry();
      
      expect(result.success).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    });
    
    it('should retry up to 3 times on failure', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync)
        .mockResolvedValueOnce({ success: false, error: 'authentication_failed' })
        .mockResolvedValueOnce({ success: false, error: 'authentication_failed' })
        .mockResolvedValueOnce({ success: true });
      
      const result = await BiometricAuth.authenticateWithRetry();
      
      expect(result.success).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(3);
    });
    
    it('should stop retrying after max attempts', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'authentication_failed',
      });
      
      const result = await BiometricAuth.authenticateWithRetry();
      
      expect(result.success).toBe(false);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(3);
    });
    
    it('should not retry on user cancellation', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'user_cancel',
      });
      
      const result = await BiometricAuth.authenticateWithRetry();
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('cancelled');
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    });
    
    it('should not retry on lockout', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'lockout',
      });
      
      const result = await BiometricAuth.authenticateWithRetry();
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('lockout');
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getBiometricTypeName', () => {
    it('should return user-friendly name for fingerprint', () => {
      expect(BiometricAuth.getBiometricTypeName('fingerprint')).toBe('Touch ID');
    });
    
    it('should return user-friendly name for facial recognition', () => {
      expect(BiometricAuth.getBiometricTypeName('facialRecognition')).toBe('Face ID');
    });
    
    it('should return user-friendly name for iris', () => {
      expect(BiometricAuth.getBiometricTypeName('iris')).toBe('Iris Recognition');
    });
    
    it('should return fallback for unknown type', () => {
      expect(BiometricAuth.getBiometricTypeName('none')).toBe('Biometric Authentication');
    });
  });
  
  describe('isLockedOut', () => {
    it('should detect lockout state', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'lockout',
      });
      
      const result = await BiometricAuth.authenticate();
      const isLockedOut = BiometricAuth.isLockedOut(result);
      
      expect(isLockedOut).toBe(true);
    });
    
    it('should return false for non-lockout failures', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ 
        success: false,
        error: 'authentication_failed',
      });
      
      const result = await BiometricAuth.authenticate();
      const isLockedOut = BiometricAuth.isLockedOut(result);
      
      expect(isLockedOut).toBe(false);
    });
  });
  
  describe('edge cases', () => {
    it('should handle missing error field gracefully', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false, error: 'unknown' });
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      // Should default to 'failed' when no specific error
      expect(['failed', 'systemCancel']).toContain(result.reason);
    });
    
    it('should handle API errors gracefully', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockRejectedValue(new Error('API error'));
      
      const result = await BiometricAuth.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.fallbackType).toBe('password');
      expect(result.reason).toBe('unavailable');
    });
  });
});
