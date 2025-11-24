import { Hono } from "hono";
import type { Env, Variables } from "../../types/env";

/**
 * T089: POST /specs/apply endpoint
 * NOTE: Temporarily stubbed for MVP deployment
 * Spec application involves file system operations which should run via CLI
 */
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.post("/apply", async (c) => {
  return c.json(
    {
      error: {
        code: "FEATURE_NOT_AVAILABLE",
        message: "Spec application must run via CLI (file system operations not supported in edge workers)",
        severity: "error",
        retryPolicy: "none",
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        hint: "Run `pnpm exec ts-node scripts/spec/apply.ts --project <projectId>`"
      },
    },
    501
  );
});

export default app;
