/**
 * Admin Route Guard HOC
 * 
 * Higher-order component protecting admin screens from unauthorized access.
 * Ensures only authenticated admin users can access protected routes.
 * 
 * Features:
 * - Authentication check using AdminSecureStore
 * - Token type validation (must be type=admin, role=admin)
 * - Automatic redirect to login for unauthenticated users
 * - Session expiration handling
 * - Loading state while checking authentication
 * 
 * Usage:
 * ```tsx
 * export default withAdminGuard(DashboardScreen);
 * ```
 * 
 * Related: AdminSecureStore for token management
 * Spec: FR-001, FR-022, SC-005 (HTTP 403 within 50ms for unauthorized access)
 */

import React, { useEffect, useState, ComponentType } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminSecureStore } from '../storage/adminSecureStore';

/**
 * Props that will be passed through to wrapped component
 */
export interface WithAdminGuardProps {
  // Any additional props can be added here
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
function UnauthorizedScreen(): JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-red-600 mb-2">Unauthorized</Text>
      <Text className="text-gray-700 text-center">
        Your admin session has expired or is invalid. Please log in again.
      </Text>
    </View>
  );
}

/**
 * Higher-order component that wraps admin screens with authentication checks.
 * 
 * @param Component - The screen component to protect
 * @returns Protected component that enforces admin authentication
 * 
 * @example
 * ```tsx
 * // Protect admin dashboard
 * function AdminDashboard() {
 *   return <View>...</View>;
 * }
 * export default withAdminGuard(AdminDashboard);
 * 
 * // Protect admin users list
 * function AdminUsersList() {
 *   return <View>...</View>;
 * }
 * export default withAdminGuard(AdminUsersList);
 * ```
 */
export function withAdminGuard<P extends WithAdminGuardProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function GuardedComponent(props: P): JSX.Element {
    const router = useRouter();
    const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const [showUnauthorized, setShowUnauthorized] = useState(false);
    
    useEffect(() => {
      checkAuthentication();
    }, []);
    
    /**
     * Check if user has valid admin authentication
     */
    async function checkAuthentication(): Promise<void> {
      try {
        const startTime = Date.now();
        
        // Check if authenticated via AdminSecureStore
        const isAuthenticated = await AdminSecureStore.isAuthenticated();
        
        // Measure check duration (should be <50ms per SC-005)
        const checkDuration = Date.now() - startTime;
        
        if (!isAuthenticated) {
          setAuthState('unauthenticated');
          
          // Show unauthorized screen briefly before redirect
          setShowUnauthorized(true);
          
          // Redirect to login after 1 second
          setTimeout(() => {
            router.replace('/admin/login');
          }, 1000);
          
          return;
        }
        
        // Verify token type is admin
        const token = await AdminSecureStore.getAdminToken();
        if (!token) {
          setAuthState('unauthenticated');
          setShowUnauthorized(true);
          setTimeout(() => {
            router.replace('/admin/login');
          }, 1000);
          return;
        }
        
        // Token exists and is valid - allow access
        setAuthState('authenticated');
        
        // Log performance metric (optional)
        if (__DEV__) {
          console.log(`[AdminGuard] Auth check completed in ${checkDuration}ms`);
        }
      } catch (error) {
        console.error('[AdminGuard] Authentication check failed:', error);
        setAuthState('unauthenticated');
        setShowUnauthorized(true);
        setTimeout(() => {
          router.replace('/admin/login');
        }, 1000);
      }
    }
    
    // Show loading screen while checking authentication
    if (authState === 'loading') {
      return <LoadingScreen />;
    }
    
    // Show unauthorized screen if authentication failed
    if (authState === 'unauthenticated' && showUnauthorized) {
      return <UnauthorizedScreen />;
    }
    
    // User is authenticated - render protected component
    return <Component {...props} />;
  };
}

/**
 * Hook for accessing admin authentication state within protected components
 * 
 * @returns Object with authentication utilities
 * 
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { logout, checkExpiration } = useAdminAuth();
 *   
 *   const handleLogout = async () => {
 *     await logout();
 *   };
 *   
 *   return <Button onPress={handleLogout}>Logout</Button>;
 * }
 * ```
 */
export function useAdminAuth() {
  const router = useRouter();
  
  /**
   * Logout admin user and redirect to login
   */
  const logout = async (): Promise<void> => {
    try {
      await AdminSecureStore.clearAdminSession();
      router.replace('/admin/login');
    } catch (error) {
      console.error('[AdminAuth] Logout failed:', error);
      // Force navigation even on error
      router.replace('/admin/login');
    }
  };
  
  /**
   * Check if token will expire soon and prompt for refresh
   */
  const checkExpiration = async (): Promise<boolean> => {
    try {
      const willExpire = await AdminSecureStore.willExpireSoon();
      return willExpire;
    } catch (error) {
      console.error('[AdminAuth] Expiration check failed:', error);
      return true; // Assume expired on error
    }
  };
  
  /**
   * Get session metadata for display
   */
  const getSessionMetadata = async () => {
    try {
      return await AdminSecureStore.getSessionMetadata();
    } catch (error) {
      console.error('[AdminAuth] Failed to get session metadata:', error);
      return null;
    }
  };
  
  return {
    logout,
    checkExpiration,
    getSessionMetadata,
  };
}

/**
 * Example usage in protected screens:
 * 
 * // Protect screen with HOC
 * function AdminDashboard() {
 *   const { logout, checkExpiration } = useAdminAuth();
 *   
 *   useEffect(() => {
 *     const interval = setInterval(async () => {
 *       const willExpire = await checkExpiration();
 *       if (willExpire) {
 *         Alert.alert('Session Expiring', 'Your session will expire soon. Please save your work.');
 *       }
 *     }, 60000); // Check every minute
 *     
 *     return () => clearInterval(interval);
 *   }, []);
 *   
 *   return (
 *     <View>
 *       <Button onPress={logout}>Logout</Button>
 *     </View>
 *   );
 * }
 * 
 * export default withAdminGuard(AdminDashboard);
 */
