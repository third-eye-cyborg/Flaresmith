import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { z } from "zod";
import { ChatClientEventSchema } from "@cloudmake/types";
import { CopilotService } from "../../services/copilotService";
import { ChatContextService } from "../../services/chatContextService";

const app = new Hono();

// T103: WebSocket chat endpoint with streaming support
app.get(
  "/stream",
  upgradeWebSocket((c) => ({
    onOpen: async (evt, ws) => {
      ws.send(JSON.stringify({ kind: "ready" }));
    },
    onMessage: async (evt, ws) => {
      try {
        const data = JSON.parse(evt.data as string);
        const parsed = ChatClientEventSchema.parse(data);
        if (parsed.kind === "start") {
          ws.send(JSON.stringify({ kind: "ack", sessionId: parsed.sessionId || null }));
          return;
        }
        if (parsed.kind === "message") {
          const copilot = new CopilotService();
          const context = await new ChatContextService().buildPromptContext("" + parsed.sessionId);
          for await (const token of copilot.streamResponse(parsed.text, context)) {
            ws.send(JSON.stringify({ kind: "token", token }));
          }
          ws.send(JSON.stringify({ kind: "complete", sessionId: parsed.sessionId }));
          return;
        }
        if (parsed.kind === "apply-request") {
          ws.send(JSON.stringify({ kind: "info", message: "Apply via REST /chat/apply-diff" }));
          return;
        }
      } catch (e: any) {
        ws.send(JSON.stringify({ kind: "error", code: "WS_ERROR", message: e?.message || "invalid message" }));
      }
    },
    onClose: () => {},
  }))
);

export default app;
