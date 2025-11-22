import { z } from 'zod';

/**
 * External API Response Validator
 * 
 * Validates and sanitizes responses from external integrations (GitHub, Cloudflare, Neon, Postman).
 * Per FR-036: Security hardening - validate all external API responses.
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public provider: string,
    public endpoint: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate external API response against expected schema
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: { provider: string; endpoint: string }
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Invalid response from ${context.provider}`,
        context.provider,
        context.endpoint,
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Common external API response schemas
 */

// GitHub repository response
export const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({
    login: z.string(),
    id: z.number(),
  }),
  private: z.boolean(),
  html_url: z.string().url(),
  default_branch: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// GitHub Codespace response
export const GitHubCodespaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.enum(['Unknown', 'Created', 'Queued', 'Provisioning', 'Available', 'Awaiting', 'Unavailable', 'Deleted', 'Moved', 'Shutdown', 'Archived', 'Starting', 'ShuttingDown', 'Failed', 'Exporting', 'Updating', 'Rebuilding']),
  web_url: z.string().url(),
  machine: z.object({
    name: z.string(),
    display_name: z.string(),
  }),
  owner: z.object({
    login: z.string(),
  }),
});

// Cloudflare deployment response
export const CloudflareDeploymentSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  environment: z.string(),
  deployment_trigger: z.object({
    type: z.string(),
  }).optional(),
  created_on: z.string(),
  modified_on: z.string(),
});

// Neon project response
export const NeonProjectSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    region_id: z.string(),
    pg_version: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

// Neon branch response
export const NeonBranchSchema = z.object({
  branch: z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

// Postman workspace response
export const PostmanWorkspaceSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['personal', 'team', 'public']),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
});

// Postman collection response
export const PostmanCollectionSchema = z.object({
  collection: z.object({
    id: z.string(),
    name: z.string(),
    uid: z.string(),
    owner: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
});

/**
 * Sanitize external data to prevent injection attacks
 */
export function sanitizeExternalData(data: any): any {
  if (typeof data === 'string') {
    // Remove potential SQL/script injection patterns
    return data
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeExternalData);
  }

  if (data !== null && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeExternalData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Validate and sanitize external API response
 */
export function validateAndSanitize<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: { provider: string; endpoint: string }
): T {
  const sanitized = sanitizeExternalData(data);
  return validateResponse(sanitized, schema, context);
}

/**
 * Rate limit response schema (common across providers)
 */
export const RateLimitHeadersSchema = z.object({
  limit: z.number().optional(),
  remaining: z.number().optional(),
  reset: z.number().optional(),
});

export function extractRateLimitHeaders(headers: Record<string, string>): {
  limit?: number;
  remaining?: number;
  reset?: number;
} {
  return {
    limit: headers['x-ratelimit-limit'] ? parseInt(headers['x-ratelimit-limit'], 10) : undefined,
    remaining: headers['x-ratelimit-remaining'] ? parseInt(headers['x-ratelimit-remaining'], 10) : undefined,
    reset: headers['x-ratelimit-reset'] ? parseInt(headers['x-ratelimit-reset'], 10) : undefined,
  };
}
