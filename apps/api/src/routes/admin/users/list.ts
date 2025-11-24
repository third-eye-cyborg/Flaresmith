import { Hono } from 'hono';
import { z } from 'zod';

const app = new Hono();

const UserListQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(['admin', 'user']).optional(),
});

app.get('/admin/users', async (c) => {
  try {
    // TODO: Verify admin token via middleware
    const query = UserListQuery.parse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      role: c.req.query('role'),
    });

    // TODO: Fetch from database with RLS context set to admin role
    // Mock response
    const users = [
      {
        id: crypto.randomUUID(),
        email: 'user1@example.com',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        email: 'admin@example.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    ];

    return c.json({
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: users.length,
        hasMore: false,
      },
      correlationId: crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
    }
    return c.json({ error: { code: 'ADMIN_USERS_LIST_FAILED', message: 'Failed to list users' } }, 500);
  }
});

export default app;
