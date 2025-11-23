import { z } from "zod";

// Input for deploying a Cloudflare Worker
export const DeployWorkerInput = z.object({
  accountId: z.string().min(1, "accountId required"),
  name: z.string().regex(/^[a-zA-Z0-9-_]+$/, "name must be alphanumeric, dash or underscore"),
  script: z.string().min(10, "script too short"),
  bindings: z.record(z.any()).optional(),
});
export type DeployWorkerInput = z.infer<typeof DeployWorkerInput>;

// Output for deploying a Cloudflare Worker
export const DeployWorkerOutput = z.object({
  workerId: z.string(),
  url: z.string().url(),
  subdomain: z.string(),
});
export type DeployWorkerOutput = z.infer<typeof DeployWorkerOutput>;

// Input for deploying a Cloudflare Pages project
export const DeployPagesInput = z.object({
  accountId: z.string().min(1),
  projectName: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  branch: z.string().min(1).default("main"),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
});
export type DeployPagesInput = z.infer<typeof DeployPagesInput>;

// Output for deploying a Cloudflare Pages project
export const DeployPagesOutput = z.object({
  projectId: z.string(),
  url: z.string().url(),
  deploymentId: z.string().optional(),
});
export type DeployPagesOutput = z.infer<typeof DeployPagesOutput>;

// Input for worker status query
export const WorkerStatusInput = z.object({
  accountId: z.string().min(1),
  name: z.string().regex(/^[a-zA-Z0-9-_]+$/),
});
export type WorkerStatusInput = z.infer<typeof WorkerStatusInput>;

// Output for worker status query
export const WorkerStatusOutput = z.object({
  deploymentId: z.string().optional(),
  url: z.string().url().optional(),
  status: z.enum(["deployed", "deploying", "failed", "none", "error"]),
  lastDeployedAt: z.string().optional(),
});
export type WorkerStatusOutput = z.infer<typeof WorkerStatusOutput>;

// Input for pages project deployment status query
export const PagesStatusInput = z.object({
  accountId: z.string().min(1),
  projectName: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  environment: z.string().min(1, "environment required"), // dev|staging|prod or preview-*
});
export type PagesStatusInput = z.infer<typeof PagesStatusInput>;

// Output for pages project deployment status query
export const PagesStatusOutput = z.object({
  deploymentId: z.string().optional(),
  url: z.string().url().optional(),
  status: z.enum(["deployed", "deploying", "failed", "none", "error"]),
  lastDeployedAt: z.string().optional(),
});
export type PagesStatusOutput = z.infer<typeof PagesStatusOutput>;
