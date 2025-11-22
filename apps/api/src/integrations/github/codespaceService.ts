import { Octokit } from "@octokit/rest";

/**
 * T044: GitHub Codespaces provisioning service
 * Handles Codespace creation for development environments
 */

export interface CreateCodespaceInput {
  owner: string;
  repo: string;
  branch?: string;
  machine?: string;
  displayName?: string;
}

export interface CreateCodespaceOutput {
  id: string;
  name: string;
  url: string;
  status: string;
}

export class GitHubCodespaceService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async createCodespace(input: CreateCodespaceInput): Promise<CreateCodespaceOutput> {
    const { owner, repo, branch = "main", machine = "basicLinux32gb", displayName } = input;

    try {
      // List existing codespaces to check for duplicates (idempotent)
      const { data: codespaces } = await this.octokit.codespaces.listInRepositoryForAuthenticatedUser(
        {
          owner,
          repository_id: await this.getRepoId(owner, repo),
        }
      );

      const existingCodespace = codespaces.codespaces.find(
        (cs) => cs.git_status.ref === branch && (displayName ? cs.display_name === displayName : true)
      );

      if (existingCodespace) {
        return {
          id: existingCodespace.id.toString(),
          name: existingCodespace.name,
          url: existingCodespace.web_url,
          status: existingCodespace.state,
        };
      }

      // Create new codespace
      const { data: codespace } = await this.octokit.codespaces.createForAuthenticatedUser({
        repository_id: await this.getRepoId(owner, repo),
        ref: branch,
        machine,
        display_name: displayName,
      });

      return {
        id: codespace.id.toString(),
        name: codespace.name,
        url: codespace.web_url,
        status: codespace.state,
      };
    } catch (error: any) {
      throw new Error(`GitHub Codespace creation failed: ${error.message}`);
    }
  }

  async getCodespace(codespaceName: string): Promise<CreateCodespaceOutput> {
    try {
      const { data: codespace } = await this.octokit.codespaces.getForAuthenticatedUser({
        codespace_name: codespaceName,
      });

      return {
        id: codespace.id.toString(),
        name: codespace.name,
        url: codespace.web_url,
        status: codespace.state,
      };
    } catch (error: any) {
      throw new Error(`GitHub Codespace fetch failed: ${error.message}`);
    }
  }

  async listCodespaces(owner: string, repo: string): Promise<CreateCodespaceOutput[]> {
    try {
      const { data: codespaces } = await this.octokit.codespaces.listInRepositoryForAuthenticatedUser(
        {
          owner,
          repository_id: await this.getRepoId(owner, repo),
        }
      );

      return codespaces.codespaces.map((cs) => ({
        id: cs.id.toString(),
        name: cs.name,
        url: cs.web_url,
        status: cs.state,
      }));
    } catch (error: any) {
      throw new Error(`GitHub Codespaces list failed: ${error.message}`);
    }
  }

  async stopCodespace(codespaceName: string): Promise<void> {
    try {
      await this.octokit.codespaces.stopForAuthenticatedUser({
        codespace_name: codespaceName,
      });
    } catch (error: any) {
      throw new Error(`GitHub Codespace stop failed: ${error.message}`);
    }
  }

  async deleteCodespace(codespaceName: string): Promise<void> {
    try {
      await this.octokit.codespaces.deleteForAuthenticatedUser({
        codespace_name: codespaceName,
      });
    } catch (error: any) {
      throw new Error(`GitHub Codespace deletion failed: ${error.message}`);
    }
  }

  private async getRepoId(owner: string, repo: string): Promise<number> {
    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    });
    return data.id;
  }
}
