import { Hono } from 'hono';
import { z } from 'zod';
import { AdminLoginInput, AdminLoginOutput } from '../../../../../../packages/types/src/auth/admin';

const app = new Hono();

app.post('/admin/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const input = AdminLoginInput.parse(body);

    // TODO: Integrate with Neon Auth SDK
    // Placeholder: validate credentials against Neon Auth
    const { email } = input;

    // Mock response for now - replace with actual Neon Auth integration
    const requiresMfa = true; // Check user's MFA status from DB

    if (requiresMfa) {
      // Generate temporary MFA token
      const mfaToken = `mfa_${Date.now()}_${Math.random().toString(36)}`;
      
      return c.json({
        mfaRequired: true,
        mfaToken,
        correlationId: crypto.randomUUID()
      });
    }

    // If no MFA required, issue tokens directly
    const accessToken = 'admin_access_token_placeholder';
    const refreshToken = 'admin_refresh_token_placeholder';

    const output = AdminLoginOutput.parse({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: crypto.randomUUID(),
        email,
        role: 'admin'
      },
      correlationId: crypto.randomUUID()
    });

    return c.json(output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
    }
    return c.json({ error: { code: 'AUTH_LOGIN_FAILED', message: 'Login failed' } }, 401);
  }
});

export default app;
