import type { DbConnection } from "../../db/connection";
import { specArtifacts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { parseEndpoints } from "../../../scripts/spec/parser";
import { generateZodSchemas } from "../../../scripts/spec/generators/zodSchemaGenerator";
import { generateDrizzleModels } from "../../../scripts/spec/generators/drizzleModelGenerator";
import { generateRoutes } from "../../../scripts/spec/generators/routeGenerator";
import { generatePostmanCollections } from "../../../scripts/spec/generators/postmanGenerator";
import { generateMcpToolDescriptors } from "../../../scripts/spec/generators/mcpToolGenerator";
import { computeDrift } from "../../../scripts/spec/driftDetector";
import type { ApplySpecResponse } from "@cloudmake/types";
import { withSpan } from "../lib/telemetry";

/**
 * T088: SpecApplyService orchestrates spec parsing, generation, and drift
 */
export class SpecApplyService {
  constructor(private db: DbConnection) {}

  async apply(projectId: string, featureDir: string): Promise<ApplySpecResponse> {
    return withSpan('SpecApplyService.apply', { attributes: { projectId, featureDir } }, async () => {
    // 1) Parse spec endpoints
    const endpoints = await parseEndpoints(featureDir);

    // 2) Generate artifacts (zod, drizzle, routes, postman, mcp)
    const [zodFiles, drizzleFiles, routeFiles, postmanFiles, mcpFiles] = await Promise.all([
      generateZodSchemas(endpoints),
      generateDrizzleModels(endpoints),
      generateRoutes(endpoints),
      generatePostmanCollections(endpoints),
      generateMcpToolDescriptors(endpoints),
    ]);

    const allGenerated = [
      ...zodFiles,
      ...drizzleFiles,
      ...routeFiles,
      ...postmanFiles,
      ...mcpFiles,
    ];

    // 3) Compute drift (no-op for now)
    const drift = await computeDrift(allGenerated);

    // 4) Record/update specArtifacts checksums (no-op content for now)
    // Placeholder upsert behavior: ensure table reachable; skip writes if nothing generated
    for (const file of allGenerated) {
      const existing = await this.db
        .select()
        .from(specArtifacts)
        .where(eq(specArtifacts.artifactPath, file.path));

      if (existing.length === 0) {
        await this.db.insert(specArtifacts).values({
          projectId,
          featureDir,
          sourcePath: `${featureDir}/spec.md`,
          artifactType: mapType(file.type),
          artifactPath: file.path,
          checksum: "", // TODO: compute checksum once content is real
        });
      } else if (existing[0]) {
        await this.db
          .update(specArtifacts)
          .set({ checksum: "" })
          .where(eq(specArtifacts.id, existing[0].id));
      }
    }

    return drift;
    });
  }
}

function mapType(t: string): any {
  switch (t) {
    case "zod":
      return "zodSchema";
    case "drizzle":
      return "drizzleModel";
    case "route":
      return "routeStub";
    case "postman":
      return "postmanCollection";
    case "mcp":
      return "mcpTool";
    case "openapi":
      return "openapi";
    default:
      return "other";
  }
}
