import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

/**
 * T030: OpenAPI Spec Generation Setup
 * Provides automatic OpenAPI documentation from Zod schemas
 */

export function createOpenAPIApp() {
  const app = new OpenAPIHono();

  // OpenAPI documentation endpoint
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      version: "0.1.0",
      title: "Flaresmith API",
      description: "Multi-environment orchestration platform API",
    },
    servers: [
      {
        url: "http://localhost:8787",
        description: "Development server",
      },
      {
        url: "https://api-staging.cloudmake.dev",
        description: "Staging server",
      },
      {
        url: "https://api.cloudmake.dev",
        description: "Production server",
      },
    ],
  });

  // Swagger UI endpoint
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
