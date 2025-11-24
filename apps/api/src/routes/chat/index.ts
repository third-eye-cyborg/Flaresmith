import { Hono } from "hono";
import streamRoute from "./stream";
import applyDiffRoute from "./applyDiff";

const app = new Hono();

app.route("/", streamRoute);
app.route("/", applyDiffRoute);

export default app;
