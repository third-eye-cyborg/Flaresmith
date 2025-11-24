# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in Flaresmith, please report it by emailing security@flaresmith.example.com. Do not open public issues for security vulnerabilities.

## Secrets Management

### Required Secrets

Flaresmith requires the following secrets to be configured:

- `GITHUB_APP_PRIVATE_KEY` - GitHub App private key for repo and Codespace provisioning
- `GITHUB_APP_ID` - GitHub App ID
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers/Pages permissions
- `NEON_API_KEY` - Neon API key for database branch management
- `POSTMAN_API_KEY` - Postman API key for collection management
- `ONE_SIGNAL_KEY` - OneSignal push notification key
- `POSTHOG_KEY` - PostHog analytics key

### Least Privilege

All tokens and API keys MUST be scoped to minimum required permissions:

- **GitHub App**: Only `repo`, `workflow`, `codespace`, `environment` permissions
- **Cloudflare API Token**: Only `Workers Scripts:Edit`, `Pages:Edit` permissions
- **Neon API Key**: Project-specific permissions only
- **Postman API Key**: Workspace-specific permissions only

### Secret Scanning

Flaresmith enforces automatic secret scanning:

1. **Pre-commit Hook**: Scans staged files for secret patterns before commit
2. **CI Validation**: GitHub Actions workflow validates all commits for leaked secrets
3. **Log Redaction**: Structured logging automatically masks secret-like patterns

Blocked patterns include:
- AWS access keys: `AKIA[0-9A-Z]{16}`
- GitHub personal access tokens: `ghp_[A-Za-z0-9]{36}`
- Private keys: `-----BEGIN.*PRIVATE KEY-----`

### Secret Rotation

- **JWT Signing Keys**: Rotate every 90 days with 7-day grace period
- **Database Encryption Keys**: Rotate annually with audit events
- **Integration Tokens**: Monitor expiration and renew proactively

## Security Best Practices

### For Contributors

1. **Never commit secrets** - Use environment variables or secret management tools
2. **Review dependencies** - Check for known vulnerabilities before adding new packages
3. **Validate inputs** - Use Zod schemas for all user inputs and external API responses
4. **Follow least privilege** - Request only the permissions you need

### For Deployments

1. **Use managed secrets** - Store secrets in Cloudflare Workers secrets, GitHub Environments, or secure vaults
2. **Enable audit logging** - All critical operations emit audit events with correlation IDs
3. **Monitor for anomalies** - Set up alerts for unusual API usage patterns
4. **Keep dependencies updated** - Regularly update packages to patch vulnerabilities

## Vulnerability Disclosure

Discovered vulnerabilities are handled with the following timeline:

1. **Day 0**: Report received and acknowledged
2. **Day 1-7**: Vulnerability assessed and validated
3. **Day 8-30**: Patch developed and tested
4. **Day 31**: Public disclosure and release

## Security Contacts

- Security Team: security@flaresmith.example.com
- GPG Key: [Link to public key]
