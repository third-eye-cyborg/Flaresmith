import { Hono } from 'hono';
import { z } from 'zod';
import { AdminLoginOutput } from '../../../../../../packages/types/src/auth/admin';

const app = new Hono();

const MfaVerifyInput = z.object({
  mfaToken: z.string(),
  code: z.string().length(6),
});

app.post('/admin/auth/mfa/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { mfaToken, code } = MfaVerifyInput.parse(body);

    // TODO: Validate mfaToken from temporary store
    // TODO: Verify TOTP code against user's MFA secret

    // Placeholder validation
    if (!mfaToken.startsWith('mfa_')) {
      return c.json({ error: { code: 'AUTH_MFA_INVALID_TOKEN', message: 'Invalid MFA token' } }, 401);
    }

    if (code !== '123456') { // Mock verification
      return c.json({ error: { code: 'AUTH_MFA_INVALID_CODE', message: 'Invalid verification code' } }, 401);
    }

    // Issue admin tokens after successful MFA
    const accessToken = 'admin_access_token_verified';
    const refreshToken = 'admin_refresh_token_verified';

    const output = AdminLoginOutput.parse({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: crypto.randomUUID(),
        email: 'admin@example.com', // TODO: Retrieve from mfaToken context
        role: 'admin'
      },
      correlationId: crypto.randomUUID()
    });

    return c.json(output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
    }
    return c.json({ error: { code: 'AUTH_MFA_VERIFY_FAILED', message: 'MFA verification failed' } }, 401);
  }
});

export default app;
