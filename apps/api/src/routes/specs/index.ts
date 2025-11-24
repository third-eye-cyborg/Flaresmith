import { Hono } from "hono";
import applyRoute from "./apply";

const app = new Hono();

app.route("/", applyRoute);

export default app;
