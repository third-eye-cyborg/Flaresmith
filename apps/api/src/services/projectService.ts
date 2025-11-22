import { db } from "../../db/connection";
import { projects, environments, integrationConfigs } from "../../db/schema";
import { GitHubRepoService } from "../integrations/github/repoService";
import { GitHubTemplateService } from "../integrations/github/templateService";
import { GitHubCodespaceService } from "../integrations/github/codespaceService";
import { NeonProjectService } from "../integrations/neon/projectService";
import { CloudflareDeployService } from "../integrations/cloudflare/deployService";
import { PostmanWorkspaceService } from "../integrations/postman/workspaceService";
import { eq } from "drizzle-orm";

/**
 * T048: ProjectService orchestrating all provisioning steps
 * Coordinates GitHub, Neon, Cloudflare, and Postman integrations
 */

export interface CreateProjectInput {
  name: string;
  slug: string;
  orgId: string;
  integrations?: {
    github?: boolean;
    cloudflare?: boolean;
    neon?: boolean;
    postman?: boolean;
    codespaces?: boolean;
  };
}

export interface CreateProjectOutput {
  projectId: string;
  name: string;
  slug: string;
  status: string;
  integrations: {
    githubRepo?: string;
    cloudflareAccountId?: string;
    neonProjectId?: string;
    postmanWorkspaceId?: string;
  };
}

export class ProjectService {
  private githubToken: string;
  private neonApiKey: string;
  private cloudflareToken: string;
  private postmanApiKey: string;

  constructor(config: {
    githubToken: string;
    neonApiKey: string;
    cloudflareToken: string;
    postmanApiKey: string;
  }) {
    this.githubToken = config.githubToken;
    this.neonApiKey = config.neonApiKey;
    this.cloudflareToken = config.cloudflareToken;
    this.postmanApiKey = config.postmanApiKey;
  }

  async createProject(input: CreateProjectInput): Promise<CreateProjectOutput> {
    const { name, slug, orgId, integrations: integrationConfig = {} } = input;

    try {
      // Create project record
      const [project] = await db
        .insert(projects)
        .values({
          name,
          slug,
          orgId,
          status: "provisioning",
          integrations: {},
        })
        .returning();

      const projectId = project.id;
      const integrationResults: any = {};

      // Provision GitHub repository
      if (integrationConfig.github) {
        try {
          const githubService = new GitHubRepoService(this.githubToken);
          const templateService = new GitHubTemplateService(this.githubToken);

          // Create repo from template
          const repo = await templateService.cloneTemplate({
            templateOwner: "cloudmake-templates",
            templateRepo: "monorepo",
            targetOwner: orgId,
            targetRepo: slug,
            description: `CloudMake project: ${name}`,
          });

          integrationResults.githubRepo = repo.fullName;

          // Initialize spec files
          await templateService.initializeSpecFiles(orgId, slug, slug, "main");

          // Create GitHub environments
          await githubService.createEnvironment(orgId, slug, "dev");
          await githubService.createEnvironment(orgId, slug, "staging");
          await githubService.createEnvironment(orgId, slug, "prod");

          // Create branches for environments
          await githubService.createBranch(orgId, slug, "staging", "main");
          await githubService.createBranch(orgId, slug, "dev", "staging");

          // Store GitHub integration config
          await db.insert(integrationConfigs).values({
            projectId,
            provider: "github",
            config: {
              owner: orgId,
              repo: slug,
              fullName: repo.fullName,
              cloneUrl: repo.cloneUrl,
            },
          });
        } catch (error: any) {
          console.error(`GitHub provisioning failed: ${error.message}`);
        }
      }

      // Provision GitHub Codespace
      if (integrationConfig.codespaces && integrationConfig.github) {
        try {
          const codespaceService = new GitHubCodespaceService(this.githubToken);
          const codespace = await codespaceService.createCodespace({
            owner: orgId,
            repo: slug,
            branch: "dev",
            displayName: `${name} Dev Environment`,
          });

          await db.insert(integrationConfigs).values({
            projectId,
            provider: "codespaces",
            config: {
              codespaceId: codespace.id,
              url: codespace.url,
              status: codespace.status,
            },
          });
        } catch (error: any) {
          console.error(`Codespace provisioning failed: ${error.message}`);
        }
      }

      // Provision Neon database
      if (integrationConfig.neon) {
        try {
          const neonService = new NeonProjectService(this.neonApiKey);

          // Create Neon project
          const neonProject = await neonService.createProject({
            name: `${name} Database`,
            region: "us-east-1",
          });

          integrationResults.neonProjectId = neonProject.projectId;

          // Create branches for environments
          await neonService.createBranch({
            projectId: neonProject.projectId,
            name: "dev",
            parentBranchId: neonProject.defaultBranch,
          });

          await neonService.createBranch({
            projectId: neonProject.projectId,
            name: "staging",
            parentBranchId: neonProject.defaultBranch,
          });

          await neonService.createBranch({
            projectId: neonProject.projectId,
            name: "prod",
            parentBranchId: neonProject.defaultBranch,
          });

          // Store Neon integration config
          await db.insert(integrationConfigs).values({
            projectId,
            provider: "neon",
            config: {
              projectId: neonProject.projectId,
              connectionString: neonProject.connectionString,
              defaultBranch: neonProject.defaultBranch,
            },
          });
        } catch (error: any) {
          console.error(`Neon provisioning failed: ${error.message}`);
        }
      }

      // Provision Cloudflare resources
      if (integrationConfig.cloudflare) {
        try {
          const cloudflareService = new CloudflareDeployService(this.cloudflareToken);
          const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";

          // Create Pages project
          const pages = await cloudflareService.deployPages({
            accountId,
            projectName: slug,
            branch: "main",
          });

          integrationResults.cloudflareAccountId = accountId;

          // Store Cloudflare integration config
          await db.insert(integrationConfigs).values({
            projectId,
            provider: "cloudflare",
            config: {
              accountId,
              pagesProjectId: pages.projectId,
              pagesUrl: pages.url,
            },
          });
        } catch (error: any) {
          console.error(`Cloudflare provisioning failed: ${error.message}`);
        }
      }

      // Provision Postman workspace
      if (integrationConfig.postman) {
        try {
          const postmanService = new PostmanWorkspaceService(this.postmanApiKey);

          // Create workspace
          const workspace = await postmanService.createWorkspace({
            name: `CloudMake - ${name}`,
            description: `API workspace for ${name}`,
            type: "team",
          });

          integrationResults.postmanWorkspaceId = workspace.workspaceId;

          // Create base collection
          await postmanService.createCollection({
            workspaceId: workspace.workspaceId,
            name: `CloudMake Base - ${name}`,
            description: `Base API collection for ${name}`,
          });

          // Create environment-specific collections
          for (const env of ["dev", "staging", "prod"]) {
            await postmanService.createCollection({
              workspaceId: workspace.workspaceId,
              name: `CloudMake - ${name} (${env})`,
              description: `${env} environment collection for ${name}`,
            });

            await postmanService.createEnvironment(workspace.workspaceId, `${name} ${env}`, {
              baseUrl: env === "prod" ? `https://${slug}.pages.dev` : `https://${env}.${slug}.pages.dev`,
              environment: env,
            });
          }

          // Store Postman integration config
          await db.insert(integrationConfigs).values({
            projectId,
            provider: "postman",
            config: {
              workspaceId: workspace.workspaceId,
            },
          });
        } catch (error: any) {
          console.error(`Postman provisioning failed: ${error.message}`);
        }
      }

      // Create environment records
      const coreEnvironments = ["dev", "staging", "prod"];
      for (const envName of coreEnvironments) {
        await db.insert(environments).values({
          projectId,
          name: envName,
          kind: "core",
          githubBranch: envName === "prod" ? "main" : envName,
          cloudflareUrl: integrationConfig.cloudflare
            ? envName === "prod"
              ? `https://${slug}.pages.dev`
              : `https://${envName}.${slug}.pages.dev`
            : null,
        });
      }

      // Update project status and integrations
      await db
        .update(projects)
        .set({
          status: "active",
          integrations: integrationResults,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return {
        projectId,
        name,
        slug,
        status: "active",
        integrations: integrationResults,
      };
    } catch (error: any) {
      // Mark project as failed
      if (input.slug) {
        await db
          .update(projects)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(projects.slug, input.slug));
      }

      throw new Error(`Project creation failed: ${error.message}`);
    }
  }

  async getProject(projectId: string) {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    } catch (error: any) {
      throw new Error(`Project fetch failed: ${error.message}`);
    }
  }
}
