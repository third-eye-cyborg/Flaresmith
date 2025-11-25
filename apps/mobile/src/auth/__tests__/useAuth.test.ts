import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

// Mock storage helpers
vi.mock('../../storage', () => {
  let tokens: any = null; let user: any = null;
  return {
    saveTokens: async (t: any) => { tokens = t; },
    getTokens: async () => tokens,
    clearTokens: async () => { tokens = null; },
    saveUserMetadata: async (u: any) => { user = u; },
    getUserMetadata: async () => user,
    shouldRefreshToken: async () => false,
  };
});

// Mock API client & resource
vi.mock('@flaresmith/api-client', () => {
  class AuthResourceMock {
    async register(req: any) { return { accessToken: 'at.1', refreshToken: 'rt.1', accessExpiresAt: new Date(Date.now()+15*60*1000).toISOString(), refreshExpiresAt: new Date(Date.now()+24*60*60*1000).toISOString(), user: { id: 'u1', email: req.email } }; }
    async login(req: any) { return { accessToken: 'at.2', refreshToken: 'rt.2', accessExpiresAt: new Date(Date.now()+15*60*1000).toISOString(), refreshExpiresAt: new Date(Date.now()+24*60*60*1000).toISOString(), user: { id: 'u1', email: req.email } }; }
    async refresh(req: any) { return { accessToken: 'at.3', refreshToken: 'rt.3', accessExpiresAt: new Date(Date.now()+15*60*1000).toISOString(), refreshExpiresAt: new Date(Date.now()+24*60*60*1000).toISOString() }; }
    async signout() { return {}; }
  }
  return { FlaresmithClient: class {}, AuthResource: AuthResourceMock };
});

function renderHook<T>(hook: () => T) {
  let value: T;
  function TestComponent() { value = hook(); return null; }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => { root.render(<TestComponent />); });
  return { get current() { return value!; } };
}

describe('useAuth hook', () => {
  it('register authenticates user', async () => {
    const hook = renderHook(() => useAuth());
    await act(async () => { await hook.current.register({ email: 'new@example.com', password: 'Str0ng!Pass123' }); });
    expect(hook.current.state.isAuthenticated).toBe(true);
    expect(hook.current.state.accessToken).toBe('at.1');
  });

  it('login updates access token', async () => {
    const hook = renderHook(() => useAuth());
    await act(async () => { await hook.current.login({ email: 'new@example.com', password: 'Str0ng!Pass123' }); });
    expect(hook.current.state.accessToken).toBe('at.2');
  });

  it('refresh updates access token', async () => {
    const hook = renderHook(() => useAuth());
    await act(async () => { await hook.current.login({ email: 'new@example.com', password: 'Str0ng!Pass123' }); });
    await act(async () => { const ok = await hook.current.refresh(); expect(ok).toBe(true); });
    expect(hook.current.state.accessToken).toBe('at.3');
  });

  it('logout clears session', async () => {
    const hook = renderHook(() => useAuth());
    await act(async () => { await hook.current.login({ email: 'new@example.com', password: 'Str0ng!Pass123' }); });
    await act(async () => { await hook.current.logout(); });
    expect(hook.current.state.isAuthenticated).toBe(false);
    expect(hook.current.state.accessToken).toBeNull();
  });
});