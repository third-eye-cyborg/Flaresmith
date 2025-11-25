import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import type { Context } from "hono";

/**
 * Minimal Flaresmith API for Cloudflare Workers
 * Health check and basic endpoints without database dependencies
 */

type Env = {
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  DATABASE_URL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Core middleware
app.use("*", cors());
app.use("*", prettyJSON());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: "0.1.0",
  });
});

// API info endpoint
// Root now serves a minimal HTML landing page
app.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Flaresmith API • ${c.env.ENVIRONMENT}</title>
  <link rel="icon" type="image/png" href="/favicon.ico" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'unsafe-inline' 'self'; img-src 'self' data:; connect-src 'self';" />
  <style>
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; margin:40px; line-height:1.4; }
    code { background:#f4f4f4; padding:2px 4px; border-radius:4px; }
    header { margin-bottom:1.5rem; }
    .pill { display:inline-block; padding:4px 10px; background:#eef; border-radius:16px; font-size:12px; }
    footer { margin-top:3rem; font-size:12px; color:#666; }
  </style>
</head>
<body>
  <header>
    <h1>Flaresmith API</h1>
    <div class="pill">Environment: ${c.env.ENVIRONMENT}</div>
  </header>
  <p>This is the minimal edge deployment of the Flaresmith platform. Core endpoints are being migrated to the Workers runtime.</p>
  <h2>Available Endpoints</h2>
  <ul>
    <li><code>GET /health</code> – status & timestamp</li>
    <li><code>GET /api/projects</code> – stub response (migration in progress)</li>
    <li><code>POST /metrics/page-load</code> – internal performance beacon</li>
  </ul>
  <script src="/script.js" defer></script>
  <footer>v0.1.0 • &copy; ${new Date().getUTCFullYear()} Flaresmith</footer>
</body>
</html>`;
  return c.newResponse(html, 200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
});

// Small transparent favicon (1x1 PNG) base64 encoded
const FAVICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+zC4J5QAAAABJRU5ErkJggg==";
app.get("/favicon.ico", (c) => {
  return c.newResponse(Buffer.from(FAVICON_BASE64, "base64"), 200, {
    "content-type": "image/png",
    "cache-control": "public, max-age=86400, immutable",
  });
});

// Performance beacon script
app.get("/script.js", (c) => {
  const script = `document.addEventListener('DOMContentLoaded',()=>{\n  const loadMs = performance.now();\n  console.log('[Log] DOMContentLoaded ms:', loadMs.toFixed(2));\n  const loadSec = (loadMs/1000).toFixed(2);\n  console.log('[Log] Sending page loading time –', loadSec,'–', location.hostname);\n  fetch('/metrics/page-load',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({loadTimeSeconds:loadSec, ts:new Date().toISOString()})}).catch(()=>{});\n});`; 
  return c.newResponse(script, 200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "no-store",
  });
});

// Page load metrics collector (fire-and-forget)
app.post("/metrics/page-load", async (c: Context) => {
  try {
    const body = await c.req.json();
    // In full implementation, forward to analytics/metrics pipeline.
    return c.json({ received: true, body }, 202);
  } catch {
    return c.json({ received: false }, 400);
  }
});

// Stub endpoints for testing
app.get("/api/projects", (c) => {
  return c.json({
    projects: [],
    message: "Project management endpoints are being migrated to Workers runtime",
  });
});

export default app;
