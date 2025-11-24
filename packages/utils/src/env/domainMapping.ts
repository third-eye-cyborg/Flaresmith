/**
 * Domain mapping utility for environment parity across dev, staging, prod.
 * Feature: 006-design-sync-integration (environment alignment task D002)
 * Constitution Reference: Environment Parity Model.
 */
export type ParityEnv = 'dev' | 'development' | 'stage' | 'staging' | 'prod' | 'production';

interface DomainMappingConfig {
  dev: string;
  stage: string;
  prod: string;
}

// Resolved from environment variables with sensible defaults
const config: DomainMappingConfig = {
  dev: process.env.DEV_APP_DOMAIN || 'dev.flaresmith.com',
  stage: process.env.STAGE_APP_DOMAIN || 'stage.flaresmith.com',
  prod: process.env.PROD_APP_DOMAIN || 'flaresmith.com',
};

/**
 * Normalize variant environment tokens to canonical key.
 */
function normalize(env?: ParityEnv): keyof DomainMappingConfig {
  switch ((env || process.env.ENVIRONMENT || 'dev').toLowerCase()) {
    case 'development':
    case 'dev':
      return 'dev';
    case 'stage':
    case 'staging':
      return 'stage';
    case 'prod':
    case 'production':
      return 'prod';
    default:
      return 'dev';
  }
}

/**
 * Get app domain for specified (or current) environment.
 */
export function getAppDomain(env?: ParityEnv): string {
  return config[normalize(env)];
}

/**
 * Resolve API base URL from domain (client-side usage). Falls back to localhost for dev if running locally.
 */
export function resolveApiBase(env?: ParityEnv): string {
  const domain = getAppDomain(env);
  if (domain === 'dev.flaresmith.com' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return `https://api.${domain}`.replace('api.flaresmith.com', 'flaresmith.com/api'); // handle prod single-domain pattern
}

export const DomainMapping = {
  dev: config.dev,
  stage: config.stage,
  prod: config.prod,
};

export default DomainMapping;
