#!/usr/bin/env ts-node
/**
 * T061: Storybook story auto-registration script
 * Feature: 006-design-sync-integration
 * 
 * Automatically registers component stories with Storybook based on:
 *  - Component metadata from component_artifacts table
 *  - Variant definitions
 *  - Design artifact mappings
 * 
 * Usage:
 *   pnpm exec ts-node scripts/design/registerStories.ts --component <componentId>
 *   pnpm exec ts-node scripts/design/registerStories.ts --all
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { componentArtifacts, designArtifacts } from '../../apps/api/db/schema/designSync';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RegistrationOptions {
  componentId?: string;
  all?: boolean;
  dryRun?: boolean;
  outputDir?: string;
}

interface StoryMetadata {
  componentName: string;
  variantName: string;
  props: Record<string, unknown>;
  designRef?: string;
}

/**
 * Generate Storybook story content for a component variant
 */
function generateStoryContent(metadata: StoryMetadata): string {
  const { componentName, variantName, props, designRef } = metadata;
  const sanitizedVariantName = variantName.replace(/[^a-zA-Z0-9]/g, '');
  
  return `// Auto-generated story for ${componentName} - ${variantName}
// Generated: ${new Date().toISOString()}
${designRef ? `// Design Reference: ${designRef}` : ''}

import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from '../components/${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const ${sanitizedVariantName}: Story = {
  args: ${JSON.stringify(props, null, 2)},
  parameters: {
    design: ${designRef ? `{ url: '${designRef}' }` : 'undefined'},
  },
};
`;
}

/**
 * Register stories for a component
 */
async function registerComponentStories(
  db: ReturnType<typeof drizzle>,
  componentId: string,
  options: RegistrationOptions
): Promise<{ registered: number; skipped: number; errors: string[] }> {
  const result = { registered: 0, skipped: 0, errors: [] as string[] };
  
  try {
    // Fetch component artifact
    const [component] = await db.select().from(componentArtifacts).where(eq(componentArtifacts.id, componentId));
    
    if (!component) {
      result.errors.push(`Component not found: ${componentId}`);
      return result;
    }
    
    // Fetch design artifact (if mapped)
    const [design] = await db.select().from(designArtifacts).where(eq(designArtifacts.componentId, componentId));
    
    // Parse variants
    const variants = Array.isArray(component.variants) ? component.variants : [];
    
    if (variants.length === 0) {
      result.errors.push(`No variants defined for component: ${component.name}`);
      return result;
    }
    
    // Generate stories for each variant
    for (const variant of variants as Array<{ name: string; props: Record<string, unknown> }>) {
      const metadata: StoryMetadata = {
        componentName: component.name,
        variantName: variant.name,
        props: variant.props || {},
        designRef: design ? String(design.variantRefs) : undefined,
      };
      
      const storyContent = generateStoryContent(metadata);
      const sanitizedComponentName = component.name.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedVariantName = variant.name.replace(/[^a-zA-Z0-9]/g, '_');
      const storyFileName = `${sanitizedComponentName}_${sanitizedVariantName}.stories.tsx`;
      const outputDir = options.outputDir || path.join(process.cwd(), 'apps/web/src/stories');
      const storyFilePath = path.join(outputDir, storyFileName);
      
      if (options.dryRun) {
        console.log(`[DRY RUN] Would write: ${storyFilePath}`);
        result.registered++;
      } else {
        try {
          await fs.mkdir(outputDir, { recursive: true });
          await fs.writeFile(storyFilePath, storyContent, 'utf-8');
          console.log(`✓ Registered story: ${storyFilePath}`);
          result.registered++;
        } catch (writeErr: unknown) {
          const message = writeErr instanceof Error ? writeErr.message : 'Unknown error';
          result.errors.push(`Failed to write ${storyFileName}: ${message}`);
          result.skipped++;
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Registration failed for ${componentId}: ${message}`);
  }
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: RegistrationOptions = {
    dryRun: args.includes('--dry-run'),
    outputDir: args.find((_a, i) => args[i - 1] === '--output-dir'),
  };
  
  const componentIdArg = args.find((_a, i) => args[i - 1] === '--component');
  const allFlag = args.includes('--all');
  
  if (!componentIdArg && !allFlag) {
    console.error('Usage: registerStories.ts --component <componentId> | --all [--dry-run] [--output-dir <path>]');
    process.exit(1);
  }
  
  // Initialize DB connection (placeholder - requires env setup)
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const db = drizzle(connectionString);
  
  let totalRegistered = 0;
  let totalSkipped = 0;
  let totalErrors: string[] = [];
  
  if (allFlag) {
    // Register all components
    const components = await db.select().from(componentArtifacts);
    console.log(`Registering stories for ${components.length} component(s)...`);
    
    for (const component of components) {
      const result = await registerComponentStories(db, component.id, options);
      totalRegistered += result.registered;
      totalSkipped += result.skipped;
      totalErrors = totalErrors.concat(result.errors);
    }
  } else if (componentIdArg) {
    // Register single component
    const result = await registerComponentStories(db, componentIdArg, options);
    totalRegistered += result.registered;
    totalSkipped += result.skipped;
    totalErrors = totalErrors.concat(result.errors);
  }
  
  console.log('\n=== Registration Summary ===');
  console.log(`Registered: ${totalRegistered}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors.length}`);
  
  if (totalErrors.length > 0) {
    console.error('\nErrors:');
    totalErrors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { registerComponentStories, generateStoryContent };
