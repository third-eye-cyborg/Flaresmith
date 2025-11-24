/**
 * GET /api/mcp/metrics (T111)
 *
 * Exposes MCP server performance metrics in JSON or Prometheus format.
 * Query Params:
 *  - format=prom (optional) -> Prometheus exposition; default JSON
 *  - serverName=<name> (optional)
 *  - days=<n> lookback window (default 7)
 *
 * Error Codes:
 *  - MCP_METRICS_EXPORT_FAILED: generic failure
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { performanceExporterFactory } from '../../services/mcp/performanceExporterService';

const app = new Hono();

const QuerySchema = z.object({
  format: z.enum(['prom', 'json']).optional(),
  serverName: z.string().min(1).optional(),
  days: z.coerce.number().int().positive().max(30).optional(),
});

app.get('/', async (c) => {
  const parsed = QuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({
      error: {
        code: 'MCP_METRICS_INVALID_QUERY',
        message: 'Invalid query parameters',
        severity: 'error',
        retryPolicy: 'none',
        timestamp: new Date().toISOString(),
        context: parsed.error.errors,
        hint: 'Use format=prom|json, days<=30',
      },
    }, 400);
  }
  const { format, serverName, days } = parsed.data;
  try {
    // Cast env for type safety
    const env = c.env as { DATABASE_URL: string };
    const exporter = performanceExporterFactory(env?.DATABASE_URL);
    if (!exporter) {
      return c.json({
        error: {
          code: 'MCP_METRICS_DB_UNAVAILABLE',
          message: 'Database connection unavailable',
          severity: 'error',
          retryPolicy: 'after_delay',
          timestamp: new Date().toISOString(),
        },
      }, 503);
    }
    const filter: { serverName?: string; days?: number } = {};
    if (serverName) filter.serverName = serverName;
    if (days) filter.days = days;
    if (format === 'prom') {
      const body = await exporter.exportPrometheus(filter);
      return new Response(body, { headers: { 'content-type': 'text/plain; version=0.0.4' } });
    }
    const json = await exporter.exportJSON(filter);
    return c.json(json);
  } catch (err) {
    console.error('[GET /api/mcp/metrics] export failed', err);
    return c.json({
      error: {
        code: 'MCP_METRICS_EXPORT_FAILED',
        message: 'Failed to export MCP metrics',
        severity: 'error',
        retryPolicy: 'exponential_backoff',
        timestamp: new Date().toISOString(),
        context: { error: err instanceof Error ? err.message : String(err) },
        hint: 'Verify metrics table exists and has correct columns',
      },
    }, 500);
  }
});

export default app;
