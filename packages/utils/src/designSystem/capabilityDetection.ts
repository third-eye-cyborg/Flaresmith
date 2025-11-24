/**
 * T008: Liquidglass Capability Detection
 * Feature: 004-design-system
 * Decision: D-002 (Feature detection for backdrop-filter & blur support)
 * 
 * Detects Liquidglass rendering capabilities on web and mobile platforms
 * enabling graceful fallback to elevation + solid tokens.
 */

/**
 * Capability detection result
 */
export interface LiquidglassCapability {
  supported: boolean;
  method: 'backdrop-filter' | 'blur-module' | 'none';
  fallbackReason?: string;
}

// Metrics (T045): track fallback frequency & reasons
const liquidglassMetrics = {
  totalChecks: 0,
  fallbackCount: 0,
  lastFallbackReason: '' as string | undefined,
};

/**
 * Detect backdrop-filter support on web platforms
 * 
 * @returns Capability detection result
 */
export function detectBackdropFilter(): LiquidglassCapability {
  liquidglassMetrics.totalChecks++;
  // Server-side rendering: assume no support
  if (typeof window === 'undefined') {
    liquidglassMetrics.fallbackCount++;
    liquidglassMetrics.lastFallbackReason = 'SSR';
    return {
      supported: false,
      method: 'none',
      fallbackReason: 'Server-side rendering environment',
    };
  }

  // Check CSS.supports API
  if (typeof CSS !== 'undefined' && CSS.supports) {
    const supported = CSS.supports('backdrop-filter', 'blur(1px)') ||
                     CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
    
    if (supported) {
      return {
        supported: true,
        method: 'backdrop-filter',
      };
    }
  }

  // Fallback: Test style property existence
  const testElement = document.createElement('div');
  const style = testElement.style as unknown as Record<string, unknown>;
  
  if ('backdropFilter' in style || 'webkitBackdropFilter' in style) {
    return {
      supported: true,
      method: 'backdrop-filter',
    };
  }

  // Check for reduced transparency preference
  const prefersReduced = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  
  return {
    supported: false,
    method: 'none',
    fallbackReason: prefersReduced 
      ? 'User prefers reduced transparency' 
      : 'backdrop-filter not supported',
  };
}

/**
 * Detect blur support on React Native platforms
 * Note: This is a placeholder for mobile-specific detection
 * Actual implementation will use React Native modules
 * 
 * @returns Capability detection result
 */
export function detectBlurSupport(): LiquidglassCapability {
  liquidglassMetrics.totalChecks++;
  // Default to supported (optimistic)
  // Actual detection requires React Native context
  return {
    supported: true,
    method: 'blur-module',
  };
}

/**
 * Detect Liquidglass capabilities for current platform
 * 
 * @param platform - Platform identifier ('web' | 'mobile')
 * @returns Capability detection result
 */
export function detectLiquidglassCapability(
  platform: 'web' | 'mobile'
): LiquidglassCapability {
  if (platform === 'web') {
    return detectBackdropFilter();
  }
  
  return detectBlurSupport();
}

/**
 * Check if Liquidglass should use fallback
 * 
 * @param capability - Capability detection result
 * @returns True if fallback required
 */
export function shouldUseFallback(capability: LiquidglassCapability): boolean {
  const fallback = !capability.supported;
  if (fallback) {
    liquidglassMetrics.fallbackCount++;
    liquidglassMetrics.lastFallbackReason = capability.fallbackReason;
  }
  return fallback;
}

/**
 * Retrieve Liquidglass metrics snapshot
 */
export function getLiquidglassMetrics() {
  return { ...liquidglassMetrics, fallbackRate: liquidglassMetrics.totalChecks === 0 ? 0 : liquidglassMetrics.fallbackCount / liquidglassMetrics.totalChecks };
}
