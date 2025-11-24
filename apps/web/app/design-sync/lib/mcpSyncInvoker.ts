// T053: MCP design.sync tool invocation wrapper
// Feature: 006-design-sync-integration
// Provides client-side utility to invoke MCP design.sync tool (if available) instead of direct REST.
// Spec References: FR-001, MCP tool descriptor design.sync.json

export interface McpSyncInput {
  components: Array<{
    componentId: string;
    direction: 'code_to_design' | 'design_to_code' | 'bidirectional';
    excludeVariants?: string[];
  }>;
  dryRun?: boolean;
}

export interface McpSyncResult {
  operationId: string;
  status: string;
  components: string[];
  diffSummary: {
    total: number;
    items: Array<{
      componentId: string;
      changeTypes: string[];
      severity?: string;
    }>;
  };
  reversibleUntil: string;
}

/**
 * Invokes MCP design.sync tool if MCP client available; otherwise falls back to REST API.
 * NOTE: Actual MCP client integration depends on runtime availability (e.g., VSCode extension, browser MCP bridge).
 * This implementation provides a placeholder structure; real integration requires MCP SDK or protocol layer.
 */
export async function invokeMcpSync(input: McpSyncInput, apiBaseUrl?: string): Promise<McpSyncResult> {
  // Placeholder: Check for MCP availability (e.g., window.__mcpClient or injected context)
  const mcpAvailable = false; // Future: detect MCP context
  
  if (mcpAvailable) {
    // Future: Call MCP protocol layer
    // const result = await window.__mcpClient.invokeTool('design.sync', input);
    // return result;
    throw new Error('MCP integration not yet available');
  }

  // Fallback to REST API
  if (!apiBaseUrl) throw new Error('API base URL required for REST fallback');
  const res = await fetch(`${apiBaseUrl}/design-sync/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Sync invocation failed: ${res.status}`);
  return res.json();
}

/**
 * React hook wrapper for MCP sync invocation with loading/error state.
 */
export function useMcpSync(apiBaseUrl: string) {
  return async (input: McpSyncInput) => {
    return invokeMcpSync(input, apiBaseUrl);
  };
}
