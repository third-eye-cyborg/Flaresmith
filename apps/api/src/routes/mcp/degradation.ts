/**
 * GET /api/mcp/degradation (T113)
 * Returns degradation snapshot for MCP servers with fallback guidance.
 */
import { Hono } from 'hono';
import { gracefulDegradationService } from '../../services/mcp/gracefulDegradationService';

const app = new Hono();

app.get('/', (c) => {
  const snapshot = gracefulDegradationService.getSnapshot();
  return c.json(snapshot);
});

app.get('/:serverName/fallback', (c) => {
  const serverName = c.req.param('serverName');
  const guidance = gracefulDegradationService.getFallbackGuidance(serverName);
  if (!guidance) {
    return c.json({
      error: {
        code: 'MCP_SERVER_NOT_DEGRADED',
        message: `Server "${serverName}" is not currently degraded or does not exist`,
        severity: 'info',
        retryPolicy: 'none',
        timestamp: new Date().toISOString(),
      },
    }, 404);
  }
  return c.json({ serverName, guidance });
});

export default app;
