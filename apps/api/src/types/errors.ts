/**
 * T069: Error Taxonomy for GitHub Secrets & Environment Management
 * Centralized error code definitions with severity, retry policies, and remediation
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum RetryPolicy {
  NONE = 'none',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  AFTER_DELAY = 'after_delay',
  MANUAL = 'manual'
}

export interface ErrorDefinition {
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryPolicy: RetryPolicy;
  httpStatus: number;
  hint?: string;
}

/**
 * GitHub Secrets API Errors (GITHUB_SECRETS_*)
 */
export const GITHUB_SECRETS_ERRORS: Record<string, ErrorDefinition> = {
  RATE_LIMIT_EXHAUSTED: {
    code: 'GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED',
    message: 'GitHub API rate limit exceeded. Please wait before retrying.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.AFTER_DELAY,
    httpStatus: 429,
    hint: 'Check X-RateLimit-Reset header for quota reset time. Scheduled sync will retry automatically.'
  },
  
  SECONDARY_RATE_LIMIT: {
    code: 'GITHUB_SECRETS_SECONDARY_RATE_LIMIT',
    message: 'Secondary rate limit exceeded (100 secret creates/hour). Wait 60 seconds.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.AFTER_DELAY,
    httpStatus: 429,
    hint: 'This is a GitHub platform limit. Reduce sync frequency or batch operations.'
  },

  ENCRYPTION_FAILED: {
    code: 'GITHUB_SECRETS_ENCRYPTION_FAILED',
    message: 'Failed to encrypt secret value with repository public key.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 500,
    hint: 'Repository public key may have rotated. Retry will fetch fresh key.'
  },

  NOT_FOUND: {
    code: 'GITHUB_SECRETS_NOT_FOUND',
    message: 'Secret not found in source scope (Actions).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Verify secret exists in GitHub Actions repository secrets before syncing.'
  },

  INVALID_NAME: {
    code: 'GITHUB_SECRETS_INVALID_NAME',
    message: 'Secret name must match pattern ^[A-Z][A-Z0-9_]*$ (uppercase, underscores only).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Rename secret in GitHub to use only uppercase letters, numbers, and underscores.'
  },

  VALUE_TOO_LARGE: {
    code: 'GITHUB_SECRETS_VALUE_TOO_LARGE',
    message: 'Secret value exceeds 64KB limit.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Store large values in external secret managers and reference credentials here.'
  },

  CONFLICT_DETECTED: {
    code: 'GITHUB_SECRETS_CONFLICT_DETECTED',
    message: 'Secret value differs between Actions and target scope. Use force=true to overwrite.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 409,
    hint: 'Run POST /github/secrets/sync with force=true to resolve conflict.'
  },

  EXCLUDED_PATTERN: {
    code: 'GITHUB_SECRETS_EXCLUDED_PATTERN',
    message: 'Secret matches exclusion pattern and will not be synced.',
    severity: ErrorSeverity.INFO,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 200,
    hint: 'This is expected behavior for platform-managed secrets like GITHUB_TOKEN.'
  },

  INSUFFICIENT_PERMISSIONS: {
    code: 'GITHUB_SECRETS_INSUFFICIENT_PERMISSIONS',
    message: 'GitHub token lacks required permissions (repo or secrets scope).',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 403,
    hint: 'Update GitHub App permissions or generate new PAT with repo and secrets scopes.'
  },

  REPOSITORY_ARCHIVED: {
    code: 'GITHUB_SECRETS_REPOSITORY_ARCHIVED',
    message: 'Cannot sync secrets for archived repository.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 403,
    hint: 'Unarchive repository in GitHub settings before syncing secrets.'
  },

  PUBLIC_KEY_FETCH_FAILED: {
    code: 'GITHUB_SECRETS_PUBLIC_KEY_FETCH_FAILED',
    message: 'Failed to fetch repository public key for encryption.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 500,
    hint: 'Verify repository exists and GitHub API is accessible. Will retry automatically.'
  }
};

/**
 * GitHub Environment Management Errors (GITHUB_ENV_*)
 */
export const GITHUB_ENV_ERRORS: Record<string, ErrorDefinition> = {
  REVIEWER_NOT_FOUND: {
    code: 'GITHUB_ENV_REVIEWER_NOT_FOUND',
    message: 'Reviewer user ID not found in repository collaborators.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Add user as repository collaborator before assigning as environment reviewer.'
  },

  PROTECTION_CONFLICT: {
    code: 'GITHUB_ENV_PROTECTION_CONFLICT',
    message: 'Environment protection rules conflict with existing settings.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 409,
    hint: 'Manually resolve conflicts in GitHub UI or use force update to override.'
  },

  INVALID_ENVIRONMENT_NAME: {
    code: 'GITHUB_ENV_INVALID_NAME',
    message: 'Environment name must be one of: dev, staging, production.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Only core environments are managed via API. Use GitHub UI for custom environments.'
  },

  BRANCH_RESTRICTION_FAILED: {
    code: 'GITHUB_ENV_BRANCH_RESTRICTION_FAILED',
    message: 'Failed to apply branch restriction (main branch does not exist).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 422,
    hint: 'Ensure main branch exists in repository before applying protection rules.'
  },

  REVIEWER_COUNT_INVALID: {
    code: 'GITHUB_ENV_REVIEWER_COUNT_INVALID',
    message: 'Required reviewers count must be >= 0 and <= 6.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'GitHub supports maximum 6 required reviewers per environment.'
  },

  WAIT_TIMER_INVALID: {
    code: 'GITHUB_ENV_WAIT_TIMER_INVALID',
    message: 'Wait timer must be between 0 and 43200 minutes (30 days).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Set waitTimer to value within allowed range.'
  },

  LINKED_RESOURCE_NOT_FOUND: {
    code: 'GITHUB_ENV_LINKED_RESOURCE_NOT_FOUND',
    message: 'Linked resource (Neon branch or Cloudflare worker) not found.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 404,
    hint: 'Provision Neon branch or Cloudflare worker before linking to environment.'
  },

  SECRET_CREATION_FAILED: {
    code: 'GITHUB_ENV_SECRET_CREATION_FAILED',
    message: 'Failed to create environment-specific secret.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 500,
    hint: 'Check GitHub API status and retry. Environment was created but secrets may be incomplete.'
  }
};

/**
 * GitHub Integration Configuration Errors (GITHUB_INTEGRATION_*)
 */
export const GITHUB_INTEGRATION_ERRORS: Record<string, ErrorDefinition> = {
  NOT_CONFIGURED: {
    code: 'GITHUB_INTEGRATION_NOT_CONFIGURED',
    message: 'Project missing GitHub integration configuration.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Complete project setup by linking GitHub repository in project settings.'
  },

  INVALID_TOKEN: {
    code: 'GITHUB_INTEGRATION_INVALID_TOKEN',
    message: 'GitHub authentication token is invalid or expired.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Regenerate GitHub App installation token or create new PAT.'
  },

  REPOSITORY_NOT_FOUND: {
    code: 'GITHUB_INTEGRATION_REPOSITORY_NOT_FOUND',
    message: 'Configured GitHub repository not found or inaccessible.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Verify repository exists and integration has access permissions.'
  },

  ORGANIZATION_ACCESS_DENIED: {
    code: 'GITHUB_INTEGRATION_ORG_ACCESS_DENIED',
    message: 'GitHub App not installed for organization or access revoked.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 403,
    hint: 'Reinstall GitHub App for organization via GitHub App settings.'
  }
};

/**
 * Secret Validation Errors (GITHUB_VALIDATION_*)
 */
export const GITHUB_VALIDATION_ERRORS: Record<string, ErrorDefinition> = {
  MISSING_SECRETS: {
    code: 'GITHUB_VALIDATION_MISSING_SECRETS',
    message: 'One or more required secrets missing from target scopes.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 207, // Multi-status
    hint: 'Run secret sync to propagate missing secrets to target scopes.'
  },

  CONFLICTING_VALUES: {
    code: 'GITHUB_VALIDATION_CONFLICTING_VALUES',
    message: 'Secret values differ between scopes (hash mismatch).',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 207,
    hint: 'Run sync with force=true to overwrite conflicting values.'
  },

  EMPTY_REQUIRED_SECRETS: {
    code: 'GITHUB_VALIDATION_EMPTY_REQUIRED_SECRETS',
    message: 'requiredSecrets array cannot be empty.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Provide at least one secret name to validate.'
  },

  CACHE_EXPIRED: {
    code: 'GITHUB_VALIDATION_CACHE_EXPIRED',
    message: 'Validation cache expired, fetching fresh data from GitHub API.',
    severity: ErrorSeverity.INFO,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 200,
    hint: 'This is normal behavior. Cache TTL is 5 minutes to reduce API calls.'
  }
};

/**
 * Combined error registry for lookup
 */
export const ERROR_REGISTRY = {
  ...GITHUB_SECRETS_ERRORS,
  ...GITHUB_ENV_ERRORS,
  ...GITHUB_INTEGRATION_ERRORS,
  ...GITHUB_VALIDATION_ERRORS
};

/**
 * Helper function to get error definition by code
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  return ERROR_REGISTRY[code.replace('GITHUB_SECRETS_', '').replace('GITHUB_ENV_', '').replace('GITHUB_INTEGRATION_', '').replace('GITHUB_VALIDATION_', '')];
}

/**
 * Helper to format error for API response
 */
export function formatErrorResponse(error: Error | ErrorDefinition, context?: Record<string, any>) {
  const def = 'code' in error ? error : getErrorDefinition(error.message);
  
  return {
    error: {
      code: def?.code || 'UNKNOWN_ERROR',
      message: def?.message || error.message,
      severity: def?.severity || ErrorSeverity.ERROR,
      retryPolicy: def?.retryPolicy || RetryPolicy.NONE,
      hint: def?.hint,
      context,
      timestamp: new Date().toISOString()
    }
  };
}
