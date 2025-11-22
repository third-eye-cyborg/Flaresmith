import { Octokit } from "@octokit/rest";

export interface FileTreeNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export class GitHubFileService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * T098: Fetch repository file tree
   * Uses the Git Trees API. If path is provided, resolves SHA first.
   */
  async getFileTree(owner: string, repo: string, ref: string, path?: string, recursive = true): Promise<FileTreeNode[]> {
    let treeSha = ref;

    // If ref is a branch name, resolve its commit SHA
    const { data: refData } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${ref}` }).catch(async (e: any) => {
      if (e.status === 404) {
        // assume ref is already a SHA
        return { data: { object: { sha: ref } } } as any;
      }
      throw e;
    });

    let commitSha: string = (refData as any).object.sha;
    // Resolve tree SHA from commit
    const { data: commit } = await this.octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
    let baseTreeSha = commit.tree.sha;

    // If a subpath is specified, we need to traverse to that tree's sha
    if (path && path !== "." && path !== "/") {
      const { data: tree } = await this.octokit.git.getTree({ owner, repo, tree_sha: baseTreeSha, recursive: "1" });
      const node = tree.tree.find((n) => n.path === path && n.type === "tree");
      if (!node || !node.sha) {
        return [];
      }
      treeSha = node.sha;
    } else {
      treeSha = baseTreeSha;
    }

    const { data } = await this.octokit.git.getTree({ owner, repo, tree_sha: treeSha, recursive: recursive ? "1" : undefined });
    return data.tree
      .filter((n) => n.type === "blob" || n.type === "tree")
      .map((n) => ({ path: n.path!, type: n.type as "blob" | "tree", sha: n.sha!, size: (n as any).size }));
  }

  /**
   * T099: Fetch file content, with optional byte-range support (performed after decode).
   * Uses Git Blob API to get base64 content and slices if byteRange provided.
   */
  async getFileContent(owner: string, repo: string, filePath: string, ref: string, byteRange?: { start: number; end: number }) {
    // First get blob SHA for the path at ref
    // Resolve tree for path
    const { data: refData } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${ref}` }).catch(async (e: any) => {
      if (e.status === 404) {
        return { data: { object: { sha: ref } } } as any;
      }
      throw e;
    });
    const commitSha: string = (refData as any).object.sha;
    const { data: commit } = await this.octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
    const { data: tree } = await this.octokit.git.getTree({ owner, repo, tree_sha: commit.tree.sha, recursive: "1" });
    const node = tree.tree.find((n) => n.path === filePath && n.type === "blob");
    if (!node || !node.sha) {
      throw new Error("FILE_NOT_FOUND");
    }

    const { data: blob } = await this.octokit.git.getBlob({ owner, repo, file_sha: node.sha });
    const decoded = this.decodeBase64Utf8(blob.content);
    if (byteRange) {
      const { start, end } = byteRange;
      const slice = decoded.slice(start, end + 1);
      return { content: slice, encoding: "utf-8", fullLength: decoded.length, range: { start, end } };
    }
    return { content: decoded, encoding: "utf-8", fullLength: decoded.length };
  }
  }

  private decodeBase64Utf8(b64: string): string {
    // Prefer atob in Workers, fallback to Buffer in Node
    try {
      if (typeof atob !== "undefined") {
        const bin = atob(b64);
        // Convert binary string to UTF-8
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder("utf-8").decode(bytes);
      }
    } catch (_) {}
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Buffer may not exist at runtime in Workers but exists in Node builds
    return Buffer.from(b64, "base64").toString("utf-8");
  }
}
