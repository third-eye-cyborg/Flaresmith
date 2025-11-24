import { z } from 'zod';
import { AdminLoginInputSchema, AdminLoginOutputSchema } from '../../types/src/auth/admin';
import { UserSignupInputSchema, UserSignupOutputSchema } from '../../types/src/auth/user';

// Dual token session client: encapsulates separate base paths & token handling
export class SessionClient {
  constructor(private baseUrl: string, private fetchImpl: typeof fetch = fetch) {}

  async adminLogin(input: z.infer<typeof AdminLoginInputSchema>) {
    const parsed = AdminLoginInputSchema.parse(input);
    const res = await this.fetchImpl(`${this.baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
    return AdminLoginOutputSchema.parse(json);
  }

  async userSignup(input: z.infer<typeof UserSignupInputSchema>) {
    const parsed = UserSignupInputSchema.parse(input);
    const res = await this.fetchImpl(`${this.baseUrl}/user/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`User signup failed: ${res.status}`);
    return UserSignupOutputSchema.parse(json);
  }
}

export const sessionClient = (baseUrl: string) => new SessionClient(baseUrl);
