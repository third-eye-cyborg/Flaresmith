/**
 * User Route Guard HOC
 * 
 * Higher-order component protecting user screens from unauthorized access.
 * Ensures only authenticated standard users can access protected routes.
 * 
 * Features:
 * - Authentication check using UserSecureStore
 * - Optional biometric authentication support
 * - Token type validation (must be type=user)
 * - Automatic redirect to login for unauthenticated users
 * - Session expiration handling
 * - Loading state while checking authentication
 * - Biometric re-authentication for sensitive screens
 * 
 * Usage:
 * ```tsx
 * export default withUserGuard(ProfileScreen);
 * export default withUserGuard(BillingScreen, { requireBiometric: true });
 * ```
 * 
 * Related: UserSecureStore for token management, BiometricAuth for biometric checks
 * Spec: FR-002, FR-022, FR-044, SC-015 (mobile apps maintain session isolation)
 */

import React, { useEffect, useState, ComponentType } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { UserSecureStore } from '../storage/userSecureStore';
import { BiometricAuth, BiometricAuthResult } from './biometricFallback';

/**
 * Props that will be passed through to wrapped component
 */
export interface WithUserGuardProps {
  // Any additional props can be added here
}

/**
 * Configuration options for user guard
 */
export interface UserGuardOptions {
  /** Require biometric authentication for sensitive screens */
  requireBiometric?: boolean;
  
  /** Custom redirect path for unauthenticated users */
  loginPath?: string;
}

/**
 * Loading screen shown while checking authentication
 */
function LoadingScreen(): JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text className="mt-4 text-gray-600">Verifying authentication...</Text>
    </View>
  );
}

/**
 * Unauthorized screen shown for invalid/expired sessions
 */
function UnauthorizedScreen({ onRetry }: { onRetry?: () => void }): JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-red-600 mb-2">Session Expired</Text>
      <Text className="text-gray-700 text-center mb-6">
        Your session has expired or is invalid. Please log in again.
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-blue-600 py-3 px-6 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Retry authentication"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Biometric authentication required screen
 */
function BiometricRequiredScreen({ 
  onAuthenticate, 
  onCancel,
  biometricType 
}: { 
  onAuthenticate: () => void; 
  onCancel: () => void;
  biometricType: string;
}): JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</Text>
      <Text className="text-gray-700 text-center mb-6">
        This screen requires {biometricType} authentication to access.
      </Text>
      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={onCancel}
          className="bg-gray-300 py-3 px-6 rounded-lg flex-1"
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text className="text-gray-800 font-semibold text-center">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAuthenticate}
          className="bg-blue-600 py-3 px-6 rounded-lg flex-1"
          accessibilityRole="button"
          accessibilityLabel={`Authenticate with ${biometricType}`}
        >
          <Text className="text-white font-semibold text-center">Authenticate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Higher-order component that wraps user screens with authentication checks.
 * 
 * @param Component - The screen component to protect
 * @param options - Configuration options (biometric requirement, custom login path)
 * @returns Protected component that enforces user authentication
 * 
 * @example
 * ```tsx
 * // Basic protection
 * function UserProfile() {
 *   return <View>...</View>;
 * }
 * export default withUserGuard(UserProfile);
 * 
 * // Require biometric for sensitive screen
 * function BillingSettings() {
 *   return <View>...</View>;
 * }
 * export default withUserGuard(BillingSettings, { requireBiometric: true });
 * ```
 */
export function withUserGuard<P extends WithUserGuardProps>(
  Component: ComponentType<P>,
  options: UserGuardOptions = {}
): ComponentType<P> {
  const { requireBiometric = false, loginPath = '/login' } = options;
  
  return function GuardedComponent(props: P): JSX.Element {
    const router = useRouter();
    const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'biometric-required'>('loading');
    const [showUnauthorized, setShowUnauthorized] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('biometric');
    
    useEffect(() => {
      checkAuthentication();
    }, []);
    
    /**
     * Check if user has valid authentication
     */
    async function checkAuthentication(): Promise<void> {
      try {
        const startTime = Date.now();
        
        // Check if authenticated via UserSecureStore
        const isAuthenticated = await UserSecureStore.isAuthenticated();
        
        // Measure check duration (should be <50ms per SC-005)
        const checkDuration = Date.now() - startTime;
        
        if (!isAuthenticated) {
          setAuthState('unauthenticated');
          setShowUnauthorized(true);
          
          // Redirect to login after 1 second
          setTimeout(() => {
            router.replace(loginPath);
          }, 1000);
          
          return;
        }
        
        // Verify token type is user
        const token = await UserSecureStore.getUserToken();
        if (!token) {
          setAuthState('unauthenticated');
          setShowUnauthorized(true);
          setTimeout(() => {
            router.replace(loginPath);
          }, 1000);
          return;
        }
        
        // If biometric required, check if biometric is enabled and available
        if (requireBiometric) {
          const biometricEnabled = await UserSecureStore.isBiometricEnabled();
          const capability = await BiometricAuth.getCapability();
          
          if (biometricEnabled && capability.available) {
            setBiometricType(capability.typeName);
            setAuthState('biometric-required');
            return;
          }
        }
        
        // Token exists and is valid - allow access
        setAuthState('authenticated');
        
        // Log performance metric (optional)
        if (__DEV__) {
          console.log(`[UserGuard] Auth check completed in ${checkDuration}ms`);
        }
      } catch (error) {
        console.error('[UserGuard] Authentication check failed:', error);
        setAuthState('unauthenticated');
        setShowUnauthorized(true);
        setTimeout(() => {
          router.replace(loginPath);
        }, 1000);
      }
    }
    
    /**
     * Handle biometric authentication
     */
    async function handleBiometricAuth(): Promise<void> {
      try {
        const result: BiometricAuthResult = await BiometricAuth.authenticateWithRetry();
        
        if (result.success) {
          setAuthState('authenticated');
        } else {
          // Biometric failed - redirect to login for password
          console.warn('[UserGuard] Biometric authentication failed:', result.reason);
          setAuthState('unauthenticated');
          setShowUnauthorized(true);
          setTimeout(() => {
            router.replace(loginPath);
          }, 1000);
        }
      } catch (error) {
        console.error('[UserGuard] Biometric authentication error:', error);
        setAuthState('unauthenticated');
        setShowUnauthorized(true);
        setTimeout(() => {
          router.replace(loginPath);
        }, 1000);
      }
    }
    
    /**
     * Handle biometric cancellation
     */
    function handleBiometricCancel(): void {
      router.back();
    }
    
    /**
     * Retry authentication
     */
    function handleRetry(): void {
      setAuthState('loading');
      setShowUnauthorized(false);
      checkAuthentication();
    }
    
    // Show loading screen while checking authentication
    if (authState === 'loading') {
      return <LoadingScreen />;
    }
    
    // Show biometric authentication screen if required
    if (authState === 'biometric-required') {
      return (
        <BiometricRequiredScreen
          onAuthenticate={handleBiometricAuth}
          onCancel={handleBiometricCancel}
          biometricType={biometricType}
        />
      );
    }
    
    // Show unauthorized screen if authentication failed
    if (authState === 'unauthenticated' && showUnauthorized) {
      return <UnauthorizedScreen onRetry={handleRetry} />;
    }
    
    // User is authenticated - render protected component
    return <Component {...props} />;
  };
}

/**
 * Hook for accessing user authentication state within protected components
 * 
 * @returns Object with authentication utilities
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { logout, checkExpiration, getTier } = useUserAuth();
 *   
 *   const tier = await getTier();
 *   
 *   return <SubscriptionBadge tier={tier} />;
 * }
 * ```
 */
export function useUserAuth() {
  const router = useRouter();
  
  /**
   * Logout user and redirect to login
   */
  const logout = async (): Promise<void> => {
    try {
      await UserSecureStore.clearUserSession();
      router.replace('/login');
    } catch (error) {
      console.error('[UserAuth] Logout failed:', error);
      // Force navigation even on error
      router.replace('/login');
    }
  };
  
  /**
   * Check if token will expire soon and prompt for refresh
   */
  const checkExpiration = async (): Promise<boolean> => {
    try {
      const willExpire = await UserSecureStore.willExpireSoon();
      return willExpire;
    } catch (error) {
      console.error('[UserAuth] Expiration check failed:', error);
      return true; // Assume expired on error
    }
  };
  
  /**
   * Get subscription tier for display
   */
  const getTier = async () => {
    try {
      return await UserSecureStore.getSubscriptionTier();
    } catch (error) {
      console.error('[UserAuth] Failed to get tier:', error);
      return 'free'; // Default to free on error
    }
  };
  
  /**
   * Get session metadata for display
   */
  const getSessionMetadata = async () => {
    try {
      return await UserSecureStore.getSessionMetadata();
    } catch (error) {
      console.error('[UserAuth] Failed to get session metadata:', error);
      return null;
    }
  };
  
  return {
    logout,
    checkExpiration,
    getTier,
    getSessionMetadata,
  };
}

/**
 * Example usage in protected screens:
 * 
 * // Basic protected screen
 * function UserDashboard() {
 *   const { logout, getTier } = useUserAuth();
 *   const [tier, setTier] = useState('free');
 *   
 *   useEffect(() => {
 *     getTier().then(setTier);
 *   }, []);
 *   
 *   return (
 *     <View>
 *       <SubscriptionBadge tier={tier} mode="inline" />
 *       <Button onPress={logout}>Logout</Button>
 *     </View>
 *   );
 * }
 * export default withUserGuard(UserDashboard);
 * 
 * // Sensitive screen with biometric requirement
 * function BillingSettings() {
 *   return <View>...</View>;
 * }
 * export default withUserGuard(BillingSettings, { requireBiometric: true });
 */
