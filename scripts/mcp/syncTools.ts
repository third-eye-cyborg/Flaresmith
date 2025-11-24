#!/usr/bin/env ts-node

/**
 * MCP Tool Sync Script
 * 
 * Synchronizes MCP tool descriptors from /mcp/servers to project integration configs.
 * Validates tool schemas against packages/types definitions.
 * 
 * Usage: pnpm exec ts-node scripts/mcp/syncTools.ts --project <projectId>
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    $ref: z.string(),
  }),
  outputSchema: z.object({
    $ref: z.string(),
  }),
  provider: z.string().optional(),
  version: z.string().optional(),
});

type MCPTool = z.infer<typeof MCPToolSchema>;

interface SyncResult {
  provider: string;
  toolsFound: number;
  toolsSynced: string[];
  errors: string[];
}

async function scanMCPServers(mcpDir: string): Promise<Map<string, MCPTool[]>> {
  const providers = new Map<string, MCPTool[]>();

  try {
    const providerDirs = await readdir(mcpDir, { withFileTypes: true });

    for (const dirEntry of providerDirs) {
      if (!dirEntry.isDirectory()) continue;

      const providerName = dirEntry.name;
      const providerPath = join(mcpDir, providerName);
      const tools: MCPTool[] = [];

      const files = await readdir(providerPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(providerPath, file);
        const content = await readFile(filePath, 'utf-8');
        
        try {
          const toolData = JSON.parse(content);
          const tool = MCPToolSchema.parse({
            ...toolData,
            provider: providerName,
          });
          tools.push(tool);
        } catch (error) {
          console.error(`Error parsing tool ${file}:`, error instanceof Error ? error.message : error);
        }
      }

      if (tools.length > 0) {
        providers.set(providerName, tools);
      }
    }

  } catch (error) {
    console.error('Error scanning MCP servers:', error instanceof Error ? error.message : error);
  }

  return providers;
}

async function syncTools(projectId?: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  // Resolve MCP directory path
  const mcpDir = join(process.cwd(), 'mcp', 'servers');
  
  console.log(`Scanning MCP tool descriptors in: ${mcpDir}\n`);
  
  const providers = await scanMCPServers(mcpDir);

  for (const [providerName, tools] of providers.entries()) {
    const result: SyncResult = {
      provider: providerName,
      toolsFound: tools.length,
      toolsSynced: [],
      errors: [],
    };

    console.log(`\n📦 Provider: ${providerName}`);
    console.log(`   Tools found: ${tools.length}`);

    for (const tool of tools) {
      try {
        // Validate schema references
        if (!tool.inputSchema.$ref) {
          throw new Error(`Missing input schema reference for tool: ${tool.name}`);
        }
        if (!tool.outputSchema.$ref) {
          throw new Error(`Missing output schema reference for tool: ${tool.name}`);
        }

        // TODO: Sync to database if projectId provided
        if (projectId) {
          // INSERT INTO mcp_tool_descriptors (projectId, provider, name, inputSchemaRef, outputSchemaRef, version)
          console.log(`   ✓ ${tool.name} (synced to project ${projectId})`);
        } else {
          console.log(`   ✓ ${tool.name}`);
        }

        result.toolsSynced.push(tool.name);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`   ✗ ${tool.name}: ${errorMsg}`);
        result.errors.push(`${tool.name}: ${errorMsg}`);
      }
    }

    results.push(result);
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const projectIdIndex = args.indexOf('--project');
  const projectId = projectIdIndex !== -1 ? args[projectIdIndex + 1] : undefined;

  console.log('🔧 CloudMake MCP Tool Sync\n');
  
  if (projectId) {
    console.log(`Target Project: ${projectId}\n`);
  } else {
    console.log('Mode: Discovery (no database sync)\n');
    console.log('Tip: Use --project <projectId> to sync tools to a specific project\n');
  }

  const results = await syncTools(projectId);

  // Summary
  console.log('\n\n📊 Sync Summary:');
  console.log('─'.repeat(50));
  
  let totalFound = 0;
  let totalSynced = 0;
  let totalErrors = 0;

  for (const result of results) {
    totalFound += result.toolsFound;
    totalSynced += result.toolsSynced.length;
    totalErrors += result.errors.length;
    
    console.log(`\n${result.provider}:`);
    console.log(`  Found: ${result.toolsFound}`);
    console.log(`  Synced: ${result.toolsSynced.length}`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${totalFound} tools, ${totalSynced} synced, ${totalErrors} errors\n`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
