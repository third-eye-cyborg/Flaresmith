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
 * Authentication Errors (AUTH_*)
 * FR-003, FR-004: Neon auth migration error taxonomy
 */
export const AUTH_ERRORS: Record<string, ErrorDefinition> = {
  INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Invalid email or password.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Verify credentials and try again. Use password reset if forgotten.'
  },

  TOKEN_EXPIRED: {
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Access token has expired.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Refresh the session using the refresh token endpoint.'
  },

  TOKEN_INVALID: {
    code: 'AUTH_TOKEN_INVALID',
    message: 'Access token is invalid or malformed.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Sign in again to obtain a new token.'
  },

  REFRESH_TOKEN_EXPIRED: {
    code: 'AUTH_REFRESH_TOKEN_EXPIRED',
    message: 'Refresh token has expired. Session must be re-established.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Sign in again to create a new session.'
  },

  REFRESH_TOKEN_REUSED: {
    code: 'AUTH_REFRESH_REUSED',
    message: 'Refresh token has already been used. Possible token theft.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'All sessions for this user have been revoked. Sign in again immediately.'
  },

  PROVIDER_UNAVAILABLE: {
    code: 'AUTH_PROVIDER_UNAVAILABLE',
    message: 'OAuth provider is currently unavailable.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 503,
    hint: 'Try again later or use a different sign-in method.'
  },

  PROVIDER_CODE_INVALID: {
    code: 'AUTH_PROVIDER_CODE_INVALID',
    message: 'OAuth authorization code is invalid or expired.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Restart the OAuth flow from the beginning.'
  },

  STATE_INVALID: {
    code: 'AUTH_STATE_INVALID',
    message: 'OAuth state parameter is invalid or expired.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Possible CSRF attack. Restart the OAuth flow.'
  },

  SESSION_NOT_FOUND: {
    code: 'AUTH_SESSION_NOT_FOUND',
    message: 'Session not found or has been revoked.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 401,
    hint: 'Sign in again to create a new session.'
  },

  USER_ALREADY_EXISTS: {
    code: 'AUTH_USER_ALREADY_EXISTS',
    message: 'A user with this email already exists.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 409,
    hint: 'Use the sign-in flow or password reset if needed.'
  },

  REGISTRATION_FAILED: {
    code: 'AUTH_REGISTRATION_FAILED',
    message: 'User registration failed due to validation or database error.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 500,
    hint: 'Check request payload and try again. Contact support if issue persists.'
  }
};

/**
 * Design System Errors (DESIGN_*)
 * T059: Override validation and workflow error taxonomy
 * FR-024, FR-025, FR-015: Override size policy, rate limits, circular references
 */
export const DESIGN_ERRORS: Record<string, ErrorDefinition> = {
  OVERRIDE_TOO_LARGE: {
    code: 'DESIGN_OVERRIDE_TOO_LARGE',
    message: 'Override exceeds 10% of total tokens (rejected by policy).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 422,
    hint: 'Reduce override scope to ≤10% of tokens or submit in multiple smaller overrides.'
  },

  OVERRIDE_RATE_LIMIT: {
    code: 'DESIGN_OVERRIDE_RATE_LIMIT',
    message: 'Override submission rate limit exceeded.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.AFTER_DELAY,
    httpStatus: 429,
    hint: 'Standard: 20/day, Premium: 40/day. Wait or upgrade to premium tier.'
  },

  OVERRIDE_CIRCULAR_REFERENCE: {
    code: 'DESIGN_OVERRIDE_CIRCULAR_REFERENCE',
    message: 'Circular token references detected in override.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 422,
    hint: 'Review token dependencies. Token A cannot reference Token B if B references A.'
  },

  OVERRIDE_INVALID_COLOR: {
    code: 'DESIGN_OVERRIDE_INVALID_COLOR',
    message: 'Invalid color format in override (must be hex, OKLCH, or HSL).',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 422,
    hint: 'Use valid color formats: #RRGGBB, oklch(L C H), or hsl(H, S%, L%).'
  },

  OVERRIDE_NOT_FOUND: {
    code: 'DESIGN_OVERRIDE_NOT_FOUND',
    message: 'Override not found.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Verify override ID is correct and override has not been deleted.'
  },

  OVERRIDE_APPROVAL_FORBIDDEN: {
    code: 'DESIGN_OVERRIDE_APPROVAL_FORBIDDEN',
    message: 'Insufficient permissions to approve overrides.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 403,
    hint: 'Only platformOwner or designDelegate roles can approve overrides.'
  },

  OVERRIDE_INVALID_STATE: {
    code: 'DESIGN_OVERRIDE_INVALID_STATE',
    message: 'Override not in valid state for requested operation.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 422,
    hint: 'Override must be in pending-approval state to be approved.'
  },

  TOKEN_NOT_FOUND: {
    code: 'DESIGN_TOKEN_NOT_FOUND',
    message: 'Requested token version not found.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Verify token version exists or omit version to get latest.'
  },

  TOKEN_INVALID_CATEGORY: {
    code: 'DESIGN_TOKEN_INVALID_CATEGORY',
    message: 'Invalid token category.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Valid categories: color, spacing, typography, radius, elevation, glass, semantic.'
  },

  DRIFT_DETECTED: {
    code: 'DESIGN_DRIFT_DETECTED',
    message: 'Token drift detected between baseline and current version.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 200,
    hint: 'Review drift report and update baseline or resolve divergence before merging.'
  },

  ACCESSIBILITY_AUDIT_FAILED: {
    code: 'DESIGN_ACCESSIBILITY_AUDIT_FAILED',
    message: 'Accessibility audit failed WCAG AA contrast requirements.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 200,
    hint: 'Review contrast ratios: ≥4.5:1 for normal text, ≥3:1 for large text.'
  },

  ROLLBACK_PERMISSION_DENIED: {
    code: 'DESIGN_ROLLBACK_PERMISSION_DENIED',
    message: 'Insufficient permissions to rollback tokens for this environment.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 403,
    hint: 'Only platformOwner or designDelegate roles may rollback production tokens.'
  },
  ROLLBACK_TARGET_NOT_FOUND: {
    code: 'DESIGN_ROLLBACK_TARGET_NOT_FOUND',
    message: 'Requested rollback target version not found.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 404,
    hint: 'Verify version exists in design_token_versions snapshot history.'
  },
  ROLLBACK_FAILED: {
    code: 'DESIGN_ROLLBACK_FAILED',
    message: 'Rollback operation failed due to snapshot integrity or persistence error.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 500,
    hint: 'Retry rollback; if persistent contact support with correlationId.'
  },
  ENV_PROMOTION_BLOCKED: {
    code: 'DESIGN_ENV_PROMOTION_BLOCKED',
    message: 'Environment promotion blocked due to pending approval override.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 409,
    hint: 'Approve or reject the pending override before promoting staging → prod.'
  },
  PREVIEW_NOT_ALLOWED_IN_PRODUCTION: {
    code: 'DESIGN_PREVIEW_NOT_ALLOWED_IN_PRODUCTION',
    message: 'Preview token layer cannot be enabled in production builds.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Remove DESIGN_PREVIEW env variable for production CI runs.'
  },
  ACCESSIBILITY_AUDIT_TIMEOUT: {
    code: 'DESIGN_ACCESSIBILITY_AUDIT_TIMEOUT',
    message: 'Accessibility audit exceeded maximum allowed duration.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 504,
    hint: 'Reduce audit scope or investigate performance regressions in token contrast calculations.'
  },
  TOKEN_VERSION_HASH_MISMATCH: {
    code: 'DESIGN_TOKEN_VERSION_HASH_MISMATCH',
    message: 'Computed token hash does not match recorded snapshot hash.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 500,
    hint: 'Potential data corruption. Recreate snapshot from canonical token set.'
  },
  TOKEN_GENERATION_FAILED: {
    code: 'DESIGN_TOKEN_GENERATION_FAILED',
    message: 'Token generation script failed to produce output artifacts.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.EXPONENTIAL_BACKOFF,
    httpStatus: 500,
    hint: 'Inspect script logs for failing layer (base, semantic, mode, override, preview).'
  },
  OVERRIDE_EMPTY_DIFF: {
    code: 'DESIGN_OVERRIDE_EMPTY_DIFF',
    message: 'Override submission contains no token changes.',
    severity: ErrorSeverity.ERROR,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 400,
    hint: 'Provide at least one token diff entry with name and newValue.'
  },
  MODE_SWITCH_LATENCY_TARGET_EXCEEDED: {
    code: 'DESIGN_MODE_SWITCH_LATENCY_TARGET_EXCEEDED',
    message: 'Mode switch latency exceeded performance target.',
    severity: ErrorSeverity.WARNING,
    retryPolicy: RetryPolicy.MANUAL,
    httpStatus: 200,
    hint: 'Profile component renders; ensure tokenService caching functioning (2s window).' 
  },
  TOKEN_CACHE_INCONSISTENT: {
    code: 'DESIGN_TOKEN_CACHE_INCONSISTENT',
    message: 'Cached token set inconsistent with latest version state.',
    severity: ErrorSeverity.CRITICAL,
    retryPolicy: RetryPolicy.NONE,
    httpStatus: 500,
    hint: 'Invalidate cache and regenerate tokens; investigate concurrent writes.'
  }
};

/**
 * Combined error registry for lookup
 */
export const ERROR_REGISTRY = {
  ...GITHUB_SECRETS_ERRORS,
  ...GITHUB_ENV_ERRORS,
  ...GITHUB_INTEGRATION_ERRORS,
  ...GITHUB_VALIDATION_ERRORS,
  ...AUTH_ERRORS,
  ...DESIGN_ERRORS
};

/**
 * Helper function to get error definition by code
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  const key = code
    .replace('GITHUB_SECRETS_', '')
    .replace('GITHUB_ENV_', '')
    .replace('GITHUB_INTEGRATION_', '')
    .replace('GITHUB_VALIDATION_', '')
    .replace('AUTH_', '')
    .replace('DESIGN_', '');
  return ERROR_REGISTRY[key];
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
