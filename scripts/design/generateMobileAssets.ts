#!/usr/bin/env tsx
/**
 * Generate placeholder mobile assets
 * Creates icon.png, splash.png, adaptive-icon.png, and favicon.png
 * Run: tsx scripts/design/generateMobileAssets.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// Simple 1x1 transparent PNG as placeholder
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Create a colored placeholder PNG (512x512 with gradient for icon)
function createColoredPNG(color: string, width: number, height: number): Buffer {
  // For now, return transparent placeholder
  // In production, use a proper image generation library like sharp or canvas
  return TRANSPARENT_PNG;
}

const assetsDir = join(process.cwd(), 'apps', 'mobile', 'assets');

// Generate assets
const assets = {
  'icon.png': createColoredPNG('#3b82f6', 512, 512),
  'splash.png': createColoredPNG('#ffffff', 1284, 2778),
  'adaptive-icon.png': createColoredPNG('#3b82f6', 512, 512),
  'favicon.png': createColoredPNG('#3b82f6', 48, 48),
};

Object.entries(assets).forEach(([filename, buffer]) => {
  const filepath = join(assetsDir, filename);
  writeFileSync(filepath, buffer);
  console.log(`✓ Created ${filename}`);
});

console.log('\nPlaceholder assets generated successfully!');
console.log('Replace these with actual branded assets for production.');
