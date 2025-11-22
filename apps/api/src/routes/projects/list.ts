import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/connection';
import { projects } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { encodeCursor, decodeCursor } from './pagination';

const ListProjectsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  orgId: z.string().uuid().optional(),
});

const app = new Hono();


/**
 * GET /projects
 * List projects with cursor-based pagination (database-backed)
 */
app.get('/', async (c) => {
  try {
    const query = ListProjectsQuerySchema.parse({
      cursor: c.req.query('cursor'),
      limit: c.req.query('limit'),
      orgId: c.req.query('orgId'),
    });

    const requestId = c.req.header('x-request-id') || crypto.randomUUID();

    console.log({
      action: 'projects.list',
      requestId,
      cursor: query.cursor,
      limit: query.limit,
      orgId: query.orgId,
    });

    // Decode cursor (format: base64 encoded JSON with last ID and timestamp)
    let cursorData: { id: string; createdAt: string } | null = null;
    if (query.cursor) {
      try {
        cursorData = decodeCursor(query.cursor);
      } catch {
        return c.json({
          error: {
            code: 'INVALID_CURSOR',
            message: 'Invalid pagination cursor',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
          },
        }, 400);
      }
    }

    // Build query with cursor pagination
    let whereClause = sql`1=1`;
    
    if (query.orgId) {
      whereClause = sql`${whereClause} AND ${projects.orgId} = ${query.orgId}`;
    }

    if (cursorData) {
      // Cursor pagination: get records after cursor
      whereClause = sql`${whereClause} AND (
        ${projects.createdAt} < ${cursorData.createdAt} OR 
        (${projects.createdAt} = ${cursorData.createdAt} AND ${projects.id} < ${cursorData.id})
      )`;
    }

    // Fetch one extra to determine if there are more results
    const items = await db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(sql`${projects.createdAt} DESC, ${projects.id} DESC`)
      .limit(query.limit + 1);

    const hasMore = items.length > query.limit;
    const resultItems = hasMore ? items.slice(0, query.limit) : items;

    // Generate next cursor from last item
    let nextCursor: string | null = null;
    if (hasMore && resultItems.length > 0) {
      const lastItem = resultItems[resultItems.length - 1]!; // guarded by length check above
      const createdAtVal = lastItem.createdAt instanceof Date ? lastItem.createdAt.toISOString() : lastItem.createdAt;
      nextCursor = encodeCursor(lastItem.id, createdAtVal);
    }

    console.log({
      action: 'projects.list.success',
      requestId,
      count: resultItems.length,
      hasMore,
    });

    return c.json({
      items: resultItems,
      hasMore,
      nextCursor,
    });

  } catch (error) {
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    
    console.error({
      action: 'projects.list.error',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          severity: 'error',
          retryPolicy: 'none',
          requestId,
          timestamp: new Date().toISOString(),
          details: error.errors,
        },
      }, 400);
    }

    return c.json({
      error: {
        code: 'INTERNAL_UNEXPECTED',
        message: 'Failed to list projects',
        severity: 'critical',
        retryPolicy: 'safe',
        requestId,
        timestamp: new Date().toISOString(),
      },
    }, 500);
  }
});

export default app;
