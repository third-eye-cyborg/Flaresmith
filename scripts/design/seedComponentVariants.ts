#!/usr/bin/env tsx
/**
 * Seed Component Variants Script
 * Implements T042: Register Card & Badge variants
 */
import { componentVariantService } from '../../apps/api/src/services/designSystem/componentVariantService';

async function main() {
  console.log('🌱 Seeding component variants...');
  const variants = [
    { component: 'Card', variant: 'elevated', tokensUsed: ['elevation.md','semantic.background.primary','semantic.foreground.primary'] },
    { component: 'Card', variant: 'glass', tokensUsed: ['glass.blur.md','glass.opacity.medium','glass.saturation.medium','semantic.background.primary'] },
    { component: 'Card', variant: 'flat', tokensUsed: ['semantic.background.secondary','semantic.foreground.primary'] },
    { component: 'Badge', variant: 'default', tokensUsed: ['action.primary-bg','action.primary-fg'] },
    { component: 'Badge', variant: 'outline', tokensUsed: ['semantic.border.default','semantic.foreground.secondary'] },
    { component: 'Badge', variant: 'subtle', tokensUsed: ['semantic.background.tertiary','semantic.foreground.secondary'] },
  ];

  for (const v of variants) {
    const created = await componentVariantService.createVariant(v);
    console.log(`   • ${created.component}:${created.variant} (id=${created.id})`);
  }
  console.log('✅ Component variants seed complete');
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}

export { main as seedComponentVariants };
