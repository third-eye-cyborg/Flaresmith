import { Octokit } from "@octokit/rest";

/**
 * T043: GitHub template monorepo cloning logic
 * Handles cloning monorepo template to new project repository
 */

export interface CloneTemplateInput {
  templateOwner: string;
  templateRepo: string;
  targetOwner: string;
  targetRepo: string;
  description?: string;
}

export interface CloneTemplateOutput {
  fullName: string;
  cloneUrl: string;
  defaultBranch: string;
}

export class GitHubTemplateService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async cloneTemplate(input: CloneTemplateInput): Promise<CloneTemplateOutput> {
    const { templateOwner, templateRepo, targetOwner, targetRepo, description } = input;

    try {
      // Check if target repo already exists (idempotent)
      try {
        const existing = await this.octokit.repos.get({
          owner: targetOwner,
          repo: targetRepo,
        });

        return {
          fullName: existing.data.full_name,
          cloneUrl: existing.data.clone_url,
          defaultBranch: existing.data.default_branch,
        };
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create repo from template
      const repo = await this.octokit.repos.createUsingTemplate({
        template_owner: templateOwner,
        template_repo: templateRepo,
        owner: targetOwner,
        name: targetRepo,
        description,
        private: true,
        include_all_branches: false,
      });

      return {
        fullName: repo.data.full_name,
        cloneUrl: repo.data.clone_url,
        defaultBranch: repo.data.default_branch,
      };
    } catch (error: any) {
      throw new Error(`GitHub template clone failed: ${error.message}`);
    }
  }

  async initializeSpecFiles(
    owner: string,
    repo: string,
    projectName: string,
    branch: string = "main"
  ): Promise<void> {
    try {
      // Create initial spec directory structure
      const specDir = `specs/001-${projectName}`;
      const files = [
        {
          path: `${specDir}/spec.md`,
          content: `# Specification: ${projectName}\n\nProject specifications go here.\n`,
        },
        {
          path: `${specDir}/plan.md`,
          content: `# Implementation Plan: ${projectName}\n\nImplementation plan goes here.\n`,
        },
        {
          path: `${specDir}/tasks.md`,
          content: `# Tasks: ${projectName}\n\nTask breakdown goes here.\n`,
        },
        {
          path: `${specDir}/quickstart.md`,
          content: `# Quickstart: ${projectName}\n\nQuickstart guide goes here.\n`,
        },
        {
          path: `${specDir}/research.md`,
          content: `# Research: ${projectName}\n\nResearch findings go here.\n`,
        },
      ];

      // Get the current commit SHA
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      const currentCommitSha = ref.object.sha;

      // Get the current tree
      const { data: commit } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      });

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await this.octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64",
          });
          return {
            path: file.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.sha,
          };
        })
      );

      // Create new tree
      const { data: newTree } = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: commit.tree.sha,
        tree: blobs,
      });

      // Create new commit
      const { data: newCommit } = await this.octokit.git.createCommit({
        owner,
        repo,
        message: `chore: initialize spec files for ${projectName}`,
        tree: newTree.sha,
        parents: [currentCommitSha],
      });

      // Update reference
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });
    } catch (error: any) {
      throw new Error(`Spec files initialization failed: ${error.message}`);
    }
  }
}
