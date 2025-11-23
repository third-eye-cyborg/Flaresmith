#!/usr/bin/env tsx

/**
 * Token Generation Script
 * 
 * Implements T019 + T056: Read tokens from design_tokens table, apply overrides, normalize, and output to:
 * - packages/config/tailwind/tokens.generated.ts (Tailwind format)
 * - packages/config/tailwind/nativewind.generated.ts (NativeWind format)
 * 
 * Requirements:
 * - FR-002: Single source of truth (database-driven)
 * - FR-005: Cross-platform token format transformation
 * - FR-023: User-extensible overrides per environment (T056)
 * - SC-001: Generation time <200ms (performance target)
 * - Decision D-005: Layer precedence (base → semantic → mode → override → preview)
 * 
 * Usage:
 *   pnpm exec tsx scripts/design/generateTokenConfigs.ts [--version <num>] [--environment <env>] [--project <uuid>] [--dry-run]
 * 
 * Parameters:
 *   --version <num>      Optional: Token version number (defaults to latest)
 *   --environment <env>  Optional: Environment name (dev|staging|prod, defaults to dev)
 *   --project <uuid>     Optional: Project ID for override filtering (required for overrides)
 *   --dry-run            Optional: Preview output without writing files
 * 
 * Examples:
 *   # Generate with base tokens only
 *   pnpm exec tsx scripts/design/generateTokenConfigs.ts
 * 
 *   # Generate with staging overrides for project
 *   pnpm exec tsx scripts/design/generateTokenConfigs.ts --environment staging --project 123e4567-e89b-12d3-a456-426614174000
 * 
 *   # Preview production tokens without writing
 *   pnpm exec tsx scripts/design/generateTokenConfigs.ts --environment prod --project <uuid> --dry-run
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { DesignToken } from '@flaresmith/types';
import { mergeTokenSets } from '@flaresmith/utils';

type EnvironmentName = 'dev' | 'staging' | 'prod';

// Import services (using relative path)
// Note: This script runs from workspace root, adjust path accordingly
const getTokenService = async () => {
  const { tokenService } = await import('../../apps/api/src/services/designSystem/tokenService');
  return tokenService;
};

const getOverrideService = async () => {
  const { db } = await import('../../apps/api/db/connection');
  const { themeOverrides } = await import('../../apps/api/db/schema/designSystem');
  const { eq, and } = await import('drizzle-orm');
  return { db, themeOverrides, eq, and };
};

interface GeneratedTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, Record<string, string>>;
  borderRadius: Record<string, string>;
  elevation: Record<string, Record<string, string>>;
  glass: Record<string, Record<string, string>>;
  semantic: Record<string, string | Record<string, string>>;
}

interface NativeWindTokens {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  fontSize: Record<string, [string, { lineHeight: string }]>;
  borderRadius: Record<string, number>;
  elevation: Record<string, { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number }>;
  glass: Record<string, { blur: number; opacity: number; saturation: number }>;
  semantic: Record<string, string | Record<string, string>>;
}

/**
 * Query auto-applied overrides for a specific environment
 * T056: Load active overrides and convert to DesignToken format
 */
async function queryOverrides(environment: EnvironmentName, projectId?: string): Promise<DesignToken[]> {
  const { db, themeOverrides, eq, and } = await getOverrideService();
  
  // Query for auto-applied overrides in this environment
  // If projectId not provided, return empty (no project-specific overrides)
  if (!projectId) {
    return [];
  }
  
  const overrideRecords = await db
    .select()
    .from(themeOverrides)
    .where(
      and(
        eq(themeOverrides.projectId, projectId),
        eq(themeOverrides.environment, environment as any),
        eq(themeOverrides.status, 'auto-applied')
      )
    );
  
  // Convert override diffs to DesignToken format
  const overrideTokens: DesignToken[] = [];
  
  for (const record of overrideRecords) {
    const tokenDiff = record.tokenDiff as Record<string, { oldValue?: unknown; newValue: unknown }>;
    
    for (const [name, change] of Object.entries(tokenDiff)) {
      // Derive category from token name (e.g., "primary.blue.500" → "color")
      const category = deriveCategory(name);
      
      overrideTokens.push({
        id: `override-${record.id}-${name}`,
        name,
        category,
        value: change.newValue as any,
        version: 0, // Overrides don't have version numbers
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString(),
      });
    }
  }
  
  return overrideTokens;
}

/**
 * Derive token category from name
 * Uses naming convention: category.name.scale
 */
function deriveCategory(name: string): 'color' | 'spacing' | 'typography' | 'radius' | 'elevation' | 'glass' | 'semantic' {
  if (name.startsWith('primary.') || name.startsWith('accent.') || name.includes('color')) {
    return 'color';
  }
  if (name.startsWith('spacing.')) {
    return 'spacing';
  }
  if (name.startsWith('typography.')) {
    return 'typography';
  }
  if (name.startsWith('radius.')) {
    return 'radius';
  }
  if (name.startsWith('elevation.')) {
    return 'elevation';
  }
  if (name.startsWith('glass.')) {
    return 'glass';
  }
  if (name.startsWith('semantic.')) {
    return 'semantic';
  }
  return 'color'; // Default fallback
}

/**
 * Normalize tokens from DB format to Tailwind-compatible structure
 */
function normalizeToTailwind(tokens: DesignToken[]): GeneratedTokens {
  const result: GeneratedTokens = {
    colors: {},
    spacing: {},
    typography: {},
    borderRadius: {},
    elevation: {},
    glass: {},
    semantic: {},
  };

  for (const token of tokens) {
    const { category, name, value } = token;

    switch (category) {
      case 'color':
        result.colors[name] = String(value);
        break;

      case 'spacing':
        result.spacing[name] = String(value);
        break;

      case 'typography':
        // Typography tokens have complex structure: { fontSize, lineHeight, fontWeight, letterSpacing }
        if (typeof value === 'object' && value !== null) {
          result.typography[name] = value as Record<string, string>;
        }
        break;

      case 'radius':
        result.borderRadius[name] = String(value);
        break;

      case 'elevation':
        // Elevation tokens have shadow properties
        if (typeof value === 'object' && value !== null) {
          result.elevation[name] = value as Record<string, string>;
        }
        break;

      case 'glass':
        // Glass tokens have blur, opacity, saturation
        if (typeof value === 'object' && value !== null) {
          result.glass[name] = value as Record<string, string>;
        }
        break;

      case 'semantic':
        // Semantic tokens can be simple strings or nested objects
        if (typeof value === 'object' && value !== null) {
          result.semantic[name] = value as Record<string, string>;
        } else {
          result.semantic[name] = String(value);
        }
        break;

      default:
        console.warn(`Unknown token category: ${category}`);
    }
  }

  return result;
}

/**
 * Transform Tailwind tokens to NativeWind format
 * 
 * Differences:
 * - Spacing: px string → numeric value (e.g., "16px" → 16)
 * - Typography: Tailwind nested object → tuple format [fontSize, { lineHeight }]
 * - Elevation: CSS shadows → React Native shadow properties
 * - Glass: CSS backdrop-filter → blur/opacity/saturation numeric values
 */
function transformToNativeWind(tailwindTokens: GeneratedTokens): NativeWindTokens {
  const result: NativeWindTokens = {
    colors: { ...tailwindTokens.colors },
    spacing: {},
    fontSize: {},
    borderRadius: {},
    elevation: {},
    glass: {},
    semantic: { ...tailwindTokens.semantic },
  };

  // Transform spacing: "16px" → 16
  for (const [key, value] of Object.entries(tailwindTokens.spacing)) {
    const numericValue = parseFloat(value);
    result.spacing[key] = isNaN(numericValue) ? 0 : numericValue;
  }

  // Transform typography: nested object → tuple format
  for (const [key, value] of Object.entries(tailwindTokens.typography)) {
    const fontSize = value.fontSize || '16px';
    const lineHeight = value.lineHeight || '1.5';
    result.fontSize[key] = [fontSize, { lineHeight }];
  }

  // Transform borderRadius: "8px" → 8
  for (const [key, value] of Object.entries(tailwindTokens.borderRadius)) {
    const numericValue = parseFloat(value);
    result.borderRadius[key] = isNaN(numericValue) ? 0 : numericValue;
  }

  // Transform elevation: CSS shadows → React Native shadow
  for (const [key, value] of Object.entries(tailwindTokens.elevation)) {
    // Example: { shadowY: "4", shadowBlur: "8", shadowColor: "rgba(0,0,0,0.1)" }
    const shadowY = parseFloat(value.shadowY || '0');
    const shadowBlur = parseFloat(value.shadowBlur || '0');
    const shadowColor = value.shadowColor || '#000000';
    
    result.elevation[key] = {
      shadowColor,
      shadowOffset: { width: 0, height: shadowY },
      shadowOpacity: 0.1,
      shadowRadius: shadowBlur,
    };
  }

  // Transform glass: CSS backdrop-filter → numeric blur/opacity/saturation
  for (const [key, value] of Object.entries(tailwindTokens.glass)) {
    // Example: { blur: "12px", opacity: "0.8", saturation: "1.2" }
    const blur = parseFloat(value.blur || '0');
    const opacity = parseFloat(value.opacity || '1');
    const saturation = parseFloat(value.saturation || '1');

    result.glass[key] = { blur, opacity, saturation };
  }

  return result;
}

/**
 * Generate TypeScript file content
 */
function generateTailwindFile(tokens: GeneratedTokens, version: number, hash: string): string {
  return `/**
 * Auto-generated Tailwind Design Tokens
 * 
 * Generated at: ${new Date().toISOString()}
 * Version: ${version}
 * Hash: ${hash}
 * 
 * DO NOT EDIT MANUALLY
 * Regenerate via: pnpm exec tsx scripts/design/generateTokenConfigs.ts
 */

export const designTokens = ${JSON.stringify(tokens, null, 2)} as const;

export const tokenVersion = ${version};
export const tokenHash = '${hash}';
`;
}

function generateNativeWindFile(tokens: NativeWindTokens, version: number, hash: string): string {
  return `/**
 * Auto-generated NativeWind Design Tokens
 * 
 * Generated at: ${new Date().toISOString()}
 * Version: ${version}
 * Hash: ${hash}
 * 
 * DO NOT EDIT MANUALLY
 * Regenerate via: pnpm exec tsx scripts/design/generateTokenConfigs.ts
 */

export const nativeWindTokens = ${JSON.stringify(tokens, null, 2)} as const;

export const tokenVersion = ${version};
export const tokenHash = '${hash}';
`;
}

/**
 * Main execution
 */
async function main() {
  const startTime = performance.now();

  const args = process.argv.slice(2);
  const versionArg = args.find(arg => arg.startsWith('--version='));
  const environmentArg = args.find(arg => arg.startsWith('--environment='));
  const projectIdArg = args.find(arg => arg.startsWith('--project='));
  const isDryRun = args.includes('--dry-run');

  const version = versionArg ? parseInt(versionArg.split('=')[1]!, 10) : undefined;
  const environment = (environmentArg ? environmentArg.split('=')[1] : 'dev') as EnvironmentName;
  const projectId = projectIdArg ? projectIdArg.split('=')[1] : undefined;

  console.log('🎨 Design Token Generation');
  console.log(`Version: ${version || 'latest'}`);
  console.log(`Environment: ${environment}`);
  console.log(`Project ID: ${projectId || 'none (no overrides)'}`);
  console.log(`Dry Run: ${isDryRun}`);
  console.log('');

  // Load token service
  const tokenService = await getTokenService();

  // Fetch base tokens from database
  console.log('📦 Fetching base tokens from database...');
  const { tokens: baseTokens, version: actualVersion } = await tokenService.getTokens({ version });

  if (baseTokens.length === 0) {
    console.error('❌ No tokens found in database');
    process.exit(1);
  }

  console.log(`✅ Loaded ${baseTokens.length} base tokens (version ${actualVersion})`);

  // Query overrides for this environment
  console.log(`🔍 Querying overrides for environment: ${environment}...`);
  const overrideTokens = await queryOverrides(environment, projectId);
  
  if (overrideTokens.length > 0) {
    console.log(`✅ Found ${overrideTokens.length} override tokens`);
  } else {
    console.log('ℹ️  No overrides found (using base tokens only)');
  }

  // Merge base tokens with overrides using mergeTokenSets utility
  console.log('🔀 Merging base tokens with overrides...');
  const mergedTokens = mergeTokenSets(
    baseTokens,
    undefined, // semantic layer (future)
    undefined, // mode layer (future: T097-T098)
    overrideTokens.length > 0 ? overrideTokens : undefined,
    undefined  // preview layer (future: T103)
  );

  console.log(`✅ Final token count: ${mergedTokens.length}`);

  // Get version hash
  const versionInfo = await tokenService.getTokenVersion(actualVersion);
  const hash = versionInfo?.hash || 'unknown';

  // Normalize to Tailwind format
  console.log('🔄 Normalizing to Tailwind format...');
  const tailwindTokens = normalizeToTailwind(mergedTokens);

  // Transform to NativeWind format
  console.log('🔄 Transforming to NativeWind format...');
  const nativeWindTokens = transformToNativeWind(tailwindTokens);

  // Generate file contents
  const tailwindContent = generateTailwindFile(tailwindTokens, actualVersion, hash);
  const nativeWindContent = generateNativeWindFile(nativeWindTokens, actualVersion, hash);

  if (isDryRun) {
    console.log('\n📄 Tailwind tokens (dry run):');
    console.log(tailwindContent);
    console.log('\n📄 NativeWind tokens (dry run):');
    console.log(nativeWindContent);
  } else {
    // Write files
    const tailwindPath = join(process.cwd(), 'packages/config/tailwind/tokens.generated.ts');
    const nativeWindPath = join(process.cwd(), 'packages/config/tailwind/nativewind.generated.ts');

    console.log(`\n💾 Writing Tailwind tokens to ${tailwindPath}...`);
    await writeFile(tailwindPath, tailwindContent, 'utf-8');

    console.log(`💾 Writing NativeWind tokens to ${nativeWindPath}...`);
    await writeFile(nativeWindPath, nativeWindContent, 'utf-8');

    console.log('✅ Token generation complete!');
  }

  const duration = performance.now() - startTime;
  console.log(`\n⏱️  Generation time: ${duration.toFixed(2)}ms`);

  if (duration > 200) {
    console.warn(`⚠️  Warning: Generation time exceeds 200ms target (SC-001)`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Token generation failed:', error);
    process.exit(1);
  });
}

export { main as generateTokenConfigs };
