import { getDb } from "../../db/connection";
import { chatSessions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { GitHubCommitService } from "../integrations/github/commitService";

export class ChatService {
  constructor(private databaseUrl: string, private githubToken: string) {}

  async createOrGetSession(projectId: string, branch: string) {
    const db = getDb(this.databaseUrl);
    const existing = await db.select().from(chatSessions).where(eq(chatSessions.projectId, projectId as any)).limit(1);
    if (existing.length > 0) return existing[0];
    const [row] = await db
      .insert(chatSessions)
      .values({ projectId: projectId as any, branch, status: "active" })
      .returning();
    return row;
  }

  async closeSession(sessionId: string) {
    const db = getDb(this.databaseUrl);
    await db.update(chatSessions).set({ status: "closed" }).where(eq(chatSessions.id, sessionId as any));
  }

  /**
   * T114: Optimistic locking with commit SHA verification
   * Attempts to commit diffs when expected base sha matches current head.
   */
  async applyDiff(opts: {
    sessionId: string;
    owner: string;
    repo: string;
    branch: string;
    baseCommitSha: string;
    message: string;
    diffs: Array<{ path: string; content: string }>;
  }): Promise<{ commitSha: string }> {
    const { sessionId, owner, repo, branch, baseCommitSha, message, diffs } = opts;
    const commit = new GitHubCommitService(this.githubToken);
    const { commitSha } = await commit.commitFiles({
      owner,
      repo,
      branch,
      message,
      changes: diffs.map((d) => ({ path: d.path, content: d.content })),
      expectedBaseSha: baseCommitSha,
    });

    const db = getDb(this.databaseUrl);
    await db.update(chatSessions).set({ headCommitSha: commitSha }).where(eq(chatSessions.id, sessionId as any));
    return { commitSha };
  }
}
