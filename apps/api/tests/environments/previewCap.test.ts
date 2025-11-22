import { describe, it, expect } from 'vitest';
import { previewService } from '../../src/services/previewService';

/**
 * T176 / FR-034: Preview Environment Cap Enforcement
 * Verifies canCreatePreview returns allowed=false and ENV_PREVIEW_LIMIT_REACHED reason at cap (15).
 */

describe('Preview environment cap (T176 / FR-034)', () => {
  it('blocks creation at cap', async () => {
    // Monkey-patch getActivePreviewCount to simulate 15 active previews
    const original = previewService.getActivePreviewCount.bind(previewService);
    (previewService as any).getActivePreviewCount = async () => 15;
    const res = await previewService.canCreatePreview('11111111-1111-4111-8111-111111111111');
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/ENV_PREVIEW_LIMIT_REACHED/);
    // restore
    (previewService as any).getActivePreviewCount = original;
  });
});
