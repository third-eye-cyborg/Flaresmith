/**
 * T019: Auth API Client
 * Typed client methods for authentication endpoints with Zod validation
 */
import { z } from "zod";

import { CloudMakeClient } from "../client";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  type RegisterRequest,
  type LoginRequest,
  type RefreshRequest,
  type AuthResponse,
  type RefreshResponse,
} from "@flaresmith/types";

export class AuthResource {
  constructor(private client: CloudMakeClient) {}

  /**
   * Register a new user with email and password
   * POST /auth/register
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    // Validate request
    RegisterRequestSchema.parse(request);
    
    // Make API call with response validation
    return this.client.post("/auth/register", AuthResponseSchema, request);
  }

  /**
   * Authenticate user with email and password
   * POST /auth/login
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    // Validate request
    LoginRequestSchema.parse(request);
    
    // Make API call with response validation
    return this.client.post("/auth/login", AuthResponseSchema, request);
  }

  /**
   * Refresh access token using refresh token
   * POST /auth/refresh
   */
  async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    // Validate request
    RefreshRequestSchema.parse(request);
    
    // Make API call with response validation
    return this.client.post("/auth/refresh", RefreshResponseSchema, request);
  }

  /**
   * Sign out current session
   * POST /auth/signout
   */
  async signout(): Promise<void> {
    await this.client.post("/auth/signout", z.void(), {});
  }

  /**
   * Sign out all sessions (across all devices)
   * POST /auth/signoutAll
   */
  async signoutAll(): Promise<void> {
    await this.client.post("/auth/signoutAll", z.void(), {});
  }
}
