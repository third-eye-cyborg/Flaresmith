#!/usr/bin/env node
/**
 * T061: MCP GitHub Secrets Tools Test Script
 * Validates descriptor schemas for newly added GitHub secret management tools.
 * No external dependencies (lightweight manual validation).
 */

const fs = require('fs');
const path = require('path');

const TOOL_FILES = [
  'syncSecrets.json',
  'createEnvironments.json',
  'validateSecrets.json',
  'getSecretSyncStatus.json',
];

const toolsDir = path.join(__dirname, '../../mcp/servers/github');

function loadTool(file) {
  const full = path.join(toolsDir, file);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function validateSchema(name, schema, sample) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema missing or invalid');
    return errors;
  }
  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (!(req in sample)) {
        errors.push(`Missing required property: ${req}`);
      }
    }
  }
  // Basic property type checks (string/array/object)
  if (schema.properties) {
    for (const [key, def] of Object.entries(schema.properties)) {
      if (key in sample) {
        const val = sample[key];
        if (def.type === 'string' && typeof val !== 'string' && !(Array.isArray(def.type) && def.type.includes('string'))) {
          errors.push(`Property ${key} expected string got ${typeof val}`);
        }
        if (def.type === 'array' && !Array.isArray(val)) {
          errors.push(`Property ${key} expected array`);
        }
        if (def.type === 'object' && (typeof val !== 'object' || Array.isArray(val))) {
          errors.push(`Property ${key} expected object`);
        }
      }
    }
  }
  return errors;
}

function buildSampleInput(toolName) {
  const projectId = '123e4567-e89b-12d3-a456-426614174000';
  switch (toolName) {
    case 'github.syncSecrets':
      return { projectId, force: false };
    case 'github.createEnvironments':
      return {
        projectId,
        environments: [
          {
            name: 'dev',
            protectionRules: { requiredReviewers: 0, restrictToMainBranch: false, waitTimer: 0 },
            secrets: [ { name: 'NEON_BRANCH_ID', value: 'branch-dev' } ],
            linkedResources: { neonBranchId: 'branch-dev', cloudflareWorkerName: 'repo-api-dev', cloudflarePagesProject: 'repo-web-dev' }
          }
        ]
      };
    case 'github.validateSecrets':
      return { projectId, requiredSecrets: ['API_KEY'] };
    case 'github.getSecretSyncStatus':
      return { projectId };
    default:
      return { projectId };
  }
}

function buildSampleOutput(toolName) {
  const now = new Date().toISOString();
  switch (toolName) {
    case 'github.syncSecrets':
      return { syncedCount: 5, skippedCount: 1, errors: [], correlationId: '550e8400-e29b-41d4-a716-446655440000', durationMs: 1234 };
    case 'github.createEnvironments':
      return { created: ['dev'], updated: [], errors: [], correlationId: '550e8400-e29b-41d4-a716-446655440000' };
    case 'github.validateSecrets':
      return {
        valid: true,
        missing: [],
        conflicts: [],
        summary: { totalSecrets: 10, missingCount: 0, conflictCount: 0, validCount: 10 },
        remediationSteps: []
      };
    case 'github.getSecretSyncStatus':
      return {
        lastSyncAt: now,
        status: 'synced',
        pendingCount: 0,
        errorCount: 0,
        nextScheduledSyncAt: now,
        quotaRemaining: { core: 4800, secrets: 95 }
      };
    default:
      return {};
  }
}

function main() {
  const results = [];
  for (const file of TOOL_FILES) {
    const tool = loadTool(file);
    const inputSample = buildSampleInput(tool.name);
    const outputSample = buildSampleOutput(tool.name);
    const inputErrors = validateSchema(`${tool.name}.input`, tool.inputSchema, inputSample);
    const outputErrors = validateSchema(`${tool.name}.output`, tool.outputSchema, outputSample);
    results.push({ tool: tool.name, inputErrors, outputErrors });
  }

  let hasErrors = false;
  for (const r of results) {
    if (r.inputErrors.length || r.outputErrors.length) {
      hasErrors = true;
      console.error(`\nTool: ${r.tool}`);
      if (r.inputErrors.length) console.error(' Input Errors:', r.inputErrors);
      if (r.outputErrors.length) console.error(' Output Errors:', r.outputErrors);
    }
  }

  if (!hasErrors) {
    console.log('All MCP GitHub secret tool schemas validated successfully.');
  } else {
    process.exit(1);
  }
}

main();
