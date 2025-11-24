#!/usr/bin/env tsx

/**
 * CI Drift Detection Script
 * Feature: 004-design-system
 * Task: T072
 * 
 * Invokes GET /design/drift before merge
 * Exits 1 if hasDrift=true to block merge (SC-008)
 * 
 * Usage:
 *   pnpm exec tsx scripts/design/checkDrift.ts [--baseline-version <num>]
 * 
 * Environment Variables:
 *   API_URL: Base URL for API (defaults to http://localhost:8787)
 */

interface DriftResponse {
  baselineVersion: number;
  currentVersion: number;
  drift: Record<string, {
    added: string[];
    removed: string[];
    changed: Array<{ name: string; old: unknown; current: unknown }>;
  }>;
  hasDrift: boolean;
}

async function checkDrift(): Promise<void> {
  const args = process.argv.slice(2);
  const baselineVersionArg = args.find(arg => arg.startsWith('--baseline-version='));
  const baselineVersion = baselineVersionArg ? parseInt(baselineVersionArg.split('=')[1]!, 10) : undefined;

  const apiUrl = process.env.API_URL || 'http://localhost:8787';
  const endpoint = baselineVersion
    ? `${apiUrl}/design/drift?baselineVersion=${baselineVersion}`
    : `${apiUrl}/design/drift`;

  console.log('🔍 Checking for token drift...');
  console.log(`Endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const data = await response.json() as DriftResponse;

    console.log(`\nBaseline: v${data.baselineVersion}`);
    console.log(`Current: v${data.currentVersion}`);
    console.log(`Drift detected: ${data.hasDrift ? 'YES ⚠️' : 'NO ✅'}`);

    if (data.hasDrift) {
      console.log('\n📊 Drift Summary by Category:\n');

      for (const [category, diff] of Object.entries(data.drift)) {
        const { added, removed, changed } = diff;
        const totalChanges = added.length + removed.length + changed.length;

        if (totalChanges === 0) continue;

        console.log(`  ${category}:`);
        if (added.length > 0) console.log(`    + Added: ${added.length} tokens`);
        if (removed.length > 0) console.log(`    - Removed: ${removed.length} tokens`);
        if (changed.length > 0) console.log(`    ~ Changed: ${changed.length} tokens`);
        console.log('');
      }

      console.error('❌ Drift detected - blocking merge per SC-008');
      console.error('Remediation: Update token baseline or revert token changes');
      process.exit(1);
    }

    console.log('✅ No drift detected - safe to merge');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Drift check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

checkDrift();
