#!/usr/bin/env tsx
/**
 * Capture Liquidglass Capability Metrics (SC-007)
 * Executes several detection cycles for web (SSR assumed false support) and mobile (optimistic support)
 * to produce fallback statistics.
 */
import { detectLiquidglassCapability, shouldUseFallback, getLiquidglassMetrics } from '@flaresmith/utils';

function simulateChecks(iterations = 5) {
  for (let i=0;i<iterations;i++) {
    const webCap = detectLiquidglassCapability('web');
    shouldUseFallback(webCap);
    const mobileCap = detectLiquidglassCapability('mobile');
    shouldUseFallback(mobileCap);
  }
}

function main() {
  simulateChecks(10);
  console.log(JSON.stringify({ metrics: getLiquidglassMetrics() }, null, 2));
}

main();
