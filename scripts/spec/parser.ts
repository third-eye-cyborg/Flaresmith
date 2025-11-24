export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type EndpointDef = {
  path: string;
  method: HttpMethod;
  operationId?: string;
  summary?: string;
  requestSchemaRef?: string;
  responseSchemaRef?: string;
};

/**
 * T081: Spec file parser for endpoint definitions
 * Minimal parser interface placeholder. In a future iteration, this will parse
 * OpenAPI at specs/<feature>/contracts/openapi.yaml and extract endpoint defs.
 */
export async function parseEndpoints(_featureDir: string): Promise<EndpointDef[]> {
  // TODO: Implement OpenAPI YAML parsing and extraction of operations
  return [];
}
