import { Hono } from "hono";
import createRoute from "./create";
import getRoute from "./get";
import environmentsRoute from "./environments";
import promoteRoute from "./promote";
import updateIntegrationsRoute from "./updateIntegrations";
import secretsRoute from "./secrets";

/**
 * Projects routes aggregator
 * Combines all project-related endpoints
 */

const app = new Hono();

// Mount sub-routes
app.route("/", createRoute);
app.route("/", getRoute);
app.route("/", environmentsRoute);
app.route("/", promoteRoute);
app.route("/", updateIntegrationsRoute);
app.route("/", secretsRoute);

export default app;
