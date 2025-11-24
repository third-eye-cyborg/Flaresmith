import { getEnv } from '../env';

/**
 * Validates presence of required environment variables for Design Sync feature.
 * Does NOT read or log secret values, only checks existence.
 */
export function validateDesignSyncEnv() {
  const required = [
    'SLACK_ACCESS_TOKEN',
    'FIGMA_API_KEY',
    'BUILDER_API_KEY',
    'OPENAI_API_KEY',
    'STORYBOOK_WEB_TOKEN',
    'STORYBOOK_MOBILE_TOKEN',
    'CYPRESS_WEB_TOKEN',
    'CYPRESS_MOBILE_TOKEN',
    'PLAYWRIGHT_WEB_TOKEN',
    'PLAYWRIGHT_MOBILE_TOKEN',
  ];
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length) {
    throw new Error(`Design Sync missing required env vars: ${missing.join(', ')}`);
  }
  return {
    ok: true,
    checked: required.length,
    missing: 0,
  } as const;
}

/**
 * Optional RAG explanation flag validation.
 */
export function validateDesignSyncRagFlag() {
  const ragEnabled = process.env.DESIGN_SYNC_RAG_EXPLAIN === 'true';
  if (ragEnabled && !process.env.OPENAI_API_KEY) {
    throw new Error('DESIGN_SYNC_RAG_EXPLAIN=true requires OPENAI_API_KEY present');
  }
  return { ragEnabled } as const;
}
