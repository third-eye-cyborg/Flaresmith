import { Octokit } from "@octokit/rest";

export interface FileChange {
  path: string;
  content: string; // full file content (utf-8)
  mode?: "100644" | "100755" | "040000" | "160000" | "120000"; // default file
}

export class GitHubCommitService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * T100: Create a commit on a branch by composing a new tree.
   * Performs optimistic concurrency: verifies current head matches expectedBaseSha when provided.
   */
  async commitFiles(params: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    changes: FileChange[];
    expectedBaseSha?: string; // optimistic lock
    author?: { name: string; email: string };
    committer?: { name: string; email: string };
  }): Promise<{ commitSha: string; newHeadSha: string }> {
    const { owner, repo, branch, message, changes, expectedBaseSha, author, committer } = params;

    // Get current head
    const { data: refData } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const currentHeadSha = refData.object.sha;
    if (expectedBaseSha && expectedBaseSha !== currentHeadSha) {
      const err = new Error("COMMIT_CONFLICT");
      (err as any).code = "COMMIT_CONFLICT";
      throw err;
    }

    // Get current tree
    const { data: currentCommit } = await this.octokit.git.getCommit({ owner, repo, commit_sha: currentHeadSha });

    // Create blobs and map to tree entries
    const treeEntries = [] as Array<{ path: string; mode: string; type: "blob"; sha: string }>;
    for (const ch of changes) {
      const blob = await this.octokit.git.createBlob({ owner, repo, content: ch.content, encoding: "utf-8" });
      treeEntries.push({ path: ch.path, mode: ch.mode ?? "100644", type: "blob", sha: blob.data.sha });
    }

    // Create new tree based on base tree
    const { data: newTree } = await this.octokit.git.createTree({
      owner,
      repo,
      base_tree: currentCommit.tree.sha,
      tree: treeEntries,
    });

    // Create commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentHeadSha],
      author,
      committer,
    });

    // Move branch ref
    await this.octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha, force: false });

    return { commitSha: newCommit.sha, newHeadSha: newCommit.sha };
  }
}
