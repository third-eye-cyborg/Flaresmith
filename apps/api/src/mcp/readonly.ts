/**
 * T044: MCP read-only mode handling.
 * Determines whether mutation tools should be disabled based on environment flag MCP_READ_ONLY.
 */
export function isMcpReadOnly(env: Record<string, string | undefined>): boolean {
  const flag = env.MCP_READ_ONLY || "";
  return ["1", "true", "yes"].includes(flag.toLowerCase());
}

export function enforceReadOnly<T extends { name: string }>(tools: T[], readOnly: boolean, mutationPrefixes: string[] = ["neon.migrate", "cloudflare.deploy", "github.create", "postman.update", "design.applyOverride"]): T[] {
  if (!readOnly) return tools;
  return tools.filter(t => !mutationPrefixes.some(prefix => t.name.startsWith(prefix)));
}
