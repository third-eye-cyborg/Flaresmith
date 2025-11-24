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
  AdminLoginInput,
  UserSignupInput,
  UserSession,
  AdminSession,
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

  /**
   * Dual auth: Admin login flow
   * POST /admin/auth/login
   */
  async adminLogin(input: z.infer<typeof AdminLoginInput>): Promise<AdminSession> {
    AdminLoginInput.parse(input);
    return this.client.post("/admin/auth/login", AdminSession, input);
  }

  /**
   * Dual auth: User signup flow (Better Auth abstraction)
   * POST /user/auth/signup
   */
  async userSignup(input: z.infer<typeof UserSignupInput>): Promise<UserSession> {
    UserSignupInput.parse(input);
    return this.client.post("/user/auth/signup", UserSession, input);
  }
}
