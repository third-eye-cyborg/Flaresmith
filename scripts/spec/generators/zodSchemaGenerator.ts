import type { EndpointDef } from "../parser";

export type GeneratedFile = {
  path: string;
  content: string;
  type: "zod" | "drizzle" | "route" | "postman" | "mcp" | "openapi" | "other";
};

/**
 * T082: Zod schema code generator (stub)
 */
export async function generateZodSchemas(_endpoints: EndpointDef[]): Promise<GeneratedFile[]> {
  return [];
}
