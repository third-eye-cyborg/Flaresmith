/*
  CLI: Apply spec-driven updates

  Usage:
    pnpm exec ts-node scripts/spec/apply.ts --project-id <uuid> [--base-url <url>]

  Env:
    CLOUDMAKE_API_BASE_URL or API_BASE_URL can be provided instead of --base-url.
    Defaults to http://localhost:8787/api
*/

import { CloudMakeClient } from "@cloudmake/api-client";
import { SpecsResource } from "@cloudmake/api-client";
import { z } from "zod";

const ArgsSchema = z.object({
  projectId: z.string().uuid(),
  baseUrl: z.string().url().optional(),
});

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project-id" || a === "-p") {
      out.projectId = argv[++i];
    } else if (a === "--base-url" || a === "-u") {
      out.baseUrl = argv[++i];
    }
  }
  const envBase = process.env.CLOUDMAKE_API_BASE_URL || process.env.API_BASE_URL;
  if (!out.baseUrl && envBase) out.baseUrl = envBase;
  if (!out.baseUrl) out.baseUrl = "http://localhost:8787/api";
  return ArgsSchema.parse(out);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const client = new CloudMakeClient({ baseUrl: args.baseUrl! });
    const specs = new SpecsResource(client);
    const report = await specs.apply({ projectId: args.projectId });
    // Pretty-print drift report JSON
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : "Failed to apply spec");
    process.exit(1);
  }
}

void main();
