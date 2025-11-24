// Cloudflare Workers Environment Bindings
export type Env = {
  ENVIRONMENT: string; // dev, staging, production
  DATABASE_URL: string;
  GITHUB_TOKEN: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  NEON_API_KEY: string;
  POSTMAN_API_KEY: string;
  MASTER_ENC_KEY: string;
  JWT_SIGNING_KEY: string;
  BASE_URL: string; // public origin for auth callbacks & trustedOrigins
};

// Extend Hono with our custom context variables
export type Variables = {
  userId: string;
  requestId: string;
  jwtPayload: any;
};
