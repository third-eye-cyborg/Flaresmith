/**
 * useApiClient Hook
 * Provides typed API client for making authenticated requests
 */

'use client';

import { useCallback } from 'react';

interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export function useApiClient(config?: ApiClientConfig) {
  const baseUrl = config?.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...config?.headers
  };

  const makeRequest = useCallback(
    async <T = unknown>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      const url = `${baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };
    },
    [baseUrl, defaultHeaders]
  );

  return {
    get: <T = unknown>(endpoint: string, options?: RequestInit) =>
      makeRequest<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
      makeRequest<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      }),
    
    put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
      makeRequest<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined
      }),
    
    patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
      makeRequest<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined
      }),
    
    delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
      makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  };
}
