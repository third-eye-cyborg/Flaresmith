import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ApplyDiffRequestSchema, ApplyDiffResponseSchema } from "@cloudmake/types";
import { ChatService } from "../../services/chatService";

const app = new Hono();

app.post(
  "/apply-diff",
  zValidator("json", ApplyDiffRequestSchema),
  async (c) => {
    const req = c.req.valid("json");
    const databaseUrl = c.env.DATABASE_URL;
    const githubToken = c.env.GITHUB_TOKEN;
    const owner = (req as any).owner || c.req.header("x-github-owner");
    const repo = (req as any).repo || c.req.header("x-github-repo");
    const branch = (req as any).branch || c.req.header("x-github-branch") || "main";
    if (!owner || !repo) {
      return c.json({ error: { code: "MISSING_REPO", message: "owner/repo required for commit" } }, 400);
    }

    const service = new ChatService(databaseUrl, githubToken);
    try {
      const result = await service.applyDiff({
        sessionId: req.sessionId,
        owner,
        repo,
        branch,
        baseCommitSha: req.baseCommitSha,
        message: req.message,
        diffs: req.diffs,
      });
      const body = ApplyDiffResponseSchema.parse({ commitSha: result.commitSha });
      return c.json(body);
    } catch (e: any) {
      if (e && e.code === "COMMIT_CONFLICT") {
        return c.json({ error: { code: "COMMIT_CONFLICT", message: "Head moved. Refresh and retry." } }, 409);
      }
      return c.json({ error: { code: "APPLY_DIFF_FAILED", message: e?.message || "Unknown error" } }, 500);
    }
  }
);

export default app;
