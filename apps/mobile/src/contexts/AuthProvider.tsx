/**
 * T023: Auth context provider
 * Makes useAuth available throughout app via React Context
 * Provides global auth state and methods to all components
 */

import React, { createContext, useContext } from "react";
import { useAuth, type UseAuthReturn } from "../hooks/useAuth";

const AuthContext = createContext<UseAuthReturn | null>(null);

/**
 * Provider component that wraps app tree
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context from any component
 * Throws if used outside AuthProvider
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
