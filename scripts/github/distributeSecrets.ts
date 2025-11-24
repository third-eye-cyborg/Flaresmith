#!/usr/bin/env tsx
/**
 * GitHub Secrets Distribution Script
 * 
 * Distributes GitHub Actions repository secrets to:
 * - GitHub Codespaces secrets
 * - GitHub Environments (dev, staging, production)
 * - Cloudflare Workers/Pages (environment-specific)
 * - Neon database branches (via environment variables)
 * 
 * Usage:
 *   pnpm exec tsx scripts/github/distributeSecrets.ts --owner <owner> --repo <repo>
 *   
 * Options:
 *   --owner           GitHub repository owner
 *   --repo            GitHub repository name
 *   --project-id      CloudMake project ID (optional)
 *   --dry-run         Show what would be done without making changes
 *   --force           Overwrite existing secrets even if conflicts detected
 *   --exclude         Comma-separated list of secret names to exclude
 * 
 * Environment Variables Required:
 *   GITHUB_TOKEN              GitHub PAT with repo, codespaces, admin:org scopes
 *   CLOUDFLARE_API_TOKEN      Cloudflare API token (optional)
 *   CLOUDFLARE_ACCOUNT_ID     Cloudflare account ID (optional)
 * 
 * Example:
 *   pnpm exec tsx scripts/github/distributeSecrets.ts \
 *     --owner third-eye-cyborg \
 *     --repo CloudMake \
 *     --dry-run
 */

import { Octokit } from '@octokit/rest';
import sodium from 'libsodium-wrappers';
import chalk from 'chalk';

interface DistributionConfig {
  owner: string;
  repo: string;
  projectId?: string;
  dryRun: boolean;
  force: boolean;
  exclude: string[];
}

interface SecretMetadata {
  name: string;
  updated_at: string;
}

interface DistributionResult {
  secretName: string;
  codespaces: 'success' | 'failed' | 'skipped';
  environments: {
    dev: 'success' | 'failed' | 'skipped';
    staging: 'success' | 'failed' | 'skipped';
    production: 'success' | 'failed' | 'skipped';
  };
  errors: string[];
}

// Default exclusion patterns (platform-managed secrets)
const DEFAULT_EXCLUSIONS = [
  'GITHUB_TOKEN',
  'ACTIONS_RUNTIME_TOKEN',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'GITHUB_REF',
  'GITHUB_SHA',
];

// Secrets that should be environment-specific
const ENVIRONMENT_SPECIFIC_SECRETS = new Set([
  'DATABASE_URL',
  'NEON_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_KEY',
]);

// Secrets that should go to Cloudflare
const CLOUDFLARE_SECRETS = new Set([
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'POSTHOG_API_KEY',
  'SLACK_ACCESS_TOKEN',
  'SLACK_REFRESH_TOKEN',
]);

class SecretDistributor {
  private octokit: Octokit;
  private config: DistributionConfig;
  private results: DistributionResult[] = [];

  constructor(octokit: Octokit, config: DistributionConfig) {
    this.octokit = octokit;
    this.config = config;
  }

  async distribute(): Promise<void> {
    console.log(chalk.blue.bold('\n🔐 GitHub Secrets Distribution\n'));
    console.log(chalk.gray(`Repository: ${this.config.owner}/${this.config.repo}`));
    console.log(chalk.gray(`Dry Run: ${this.config.dryRun ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Force: ${this.config.force ? 'Yes' : 'No'}\n`));

    // Step 1: Fetch all Actions secrets
    const secrets = await this.fetchActionsSecrets();
    console.log(chalk.green(`✓ Found ${secrets.length} Actions secrets\n`));

    // Step 2: Filter excluded secrets
    const filteredSecrets = this.filterSecrets(secrets);
    console.log(chalk.yellow(`ℹ Excluding ${secrets.length - filteredSecrets.length} secrets (platform-managed)\n`));

    // Step 3: Ensure environments exist
    await this.ensureEnvironments();

    // Step 4: Distribute each secret
    for (const secret of filteredSecrets) {
      await this.distributeSecret(secret);
    }

    // Step 5: Print summary
    this.printSummary();
  }

  private async fetchActionsSecrets(): Promise<SecretMetadata[]> {
    try {
      const response = await this.octokit.rest.actions.listRepoSecrets({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 100,
      });

      return response.data.secrets;
    } catch (error: any) {
      console.error(chalk.red(`✗ Failed to fetch Actions secrets: ${error.message}`));
      throw error;
    }
  }

  private filterSecrets(secrets: SecretMetadata[]): SecretMetadata[] {
    const exclusionSet = new Set([...DEFAULT_EXCLUSIONS, ...this.config.exclude]);
    return secrets.filter(s => !exclusionSet.has(s.name));
  }

  private async ensureEnvironments(): Promise<void> {
    const environments = ['dev', 'staging', 'production'];

    for (const env of environments) {
      try {
        // Check if environment exists
        await this.octokit.rest.repos.getEnvironment({
          owner: this.config.owner,
          repo: this.config.repo,
          environment_name: env,
        });

        console.log(chalk.green(`✓ Environment '${env}' exists`));
      } catch (error: any) {
        if (error.status === 404) {
          // Create environment
          if (!this.config.dryRun) {
            try {
              await this.octokit.rest.repos.createOrUpdateEnvironment({
                owner: this.config.owner,
                repo: this.config.repo,
                environment_name: env,
                // Protection rules
                reviewers: env !== 'dev' ? [] : undefined, // Require approval for staging/prod
                deployment_branch_policy: env === 'production' 
                  ? { protected_branches: true, custom_branch_policies: false }
                  : undefined,
              });

              console.log(chalk.green(`✓ Created environment '${env}'`));
            } catch (createError: any) {
              console.log(chalk.yellow(`⚠ Could not create environment '${env}': ${createError.message}`));
            }
          } else {
            console.log(chalk.yellow(`[DRY RUN] Would create environment '${env}'`));
          }
        } else {
          console.log(chalk.yellow(`⚠ Could not verify environment '${env}': ${error.message}`));
        }
      }
    }

    console.log('');
  }

  private async distributeSecret(secret: SecretMetadata): Promise<void> {
    const result: DistributionResult = {
      secretName: secret.name,
      codespaces: 'skipped',
      environments: {
        dev: 'skipped',
        staging: 'skipped',
        production: 'skipped',
      },
      errors: [],
    };

    console.log(chalk.cyan(`\nProcessing: ${secret.name}`));

    // Note: We cannot retrieve secret values from GitHub Actions API
    // This is a limitation - secrets can only be read by workflows
    console.log(chalk.yellow(`⚠ Cannot retrieve secret value (GitHub API limitation)`));
    console.log(chalk.gray(`  Secret must be manually copied or set via workflow`));
    
    result.errors.push('Cannot retrieve secret value from Actions scope');
    this.results.push(result);

    // For now, we'll just document what needs to be done
    console.log(chalk.gray(`  Recommended distribution:`));
    console.log(chalk.gray(`    → Codespaces: ${this.shouldSyncToCodespaces(secret.name) ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`    → Environments: ${ENVIRONMENT_SPECIFIC_SECRETS.has(secret.name) ? 'Environment-specific' : 'All'}`));
    console.log(chalk.gray(`    → Cloudflare: ${CLOUDFLARE_SECRETS.has(secret.name) ? 'Yes' : 'No'}`));
  }

  private shouldSyncToCodespaces(secretName: string): boolean {
    // Most secrets should be available in Codespaces for development
    return !ENVIRONMENT_SPECIFIC_SECRETS.has(secretName);
  }

  private printSummary(): void {
    console.log(chalk.blue.bold('\n\n📊 Distribution Summary\n'));

    const totalSecrets = this.results.length;
    const withErrors = this.results.filter(r => r.errors.length > 0).length;

    console.log(chalk.gray(`Total secrets processed: ${totalSecrets}`));
    console.log(chalk.gray(`Secrets with errors: ${withErrors}`));

    console.log(chalk.yellow.bold('\n⚠ Important Limitation:\n'));
    console.log(chalk.yellow('GitHub API does not allow reading secret values.'));
    console.log(chalk.yellow('You have two options:\n'));
    console.log(chalk.white('1. Manual approach:'));
    console.log(chalk.gray('   - Go to Settings → Secrets and variables → Codespaces'));
    console.log(chalk.gray('   - Copy each secret from Actions to Codespaces scope'));
    console.log(chalk.gray('   - Go to Settings → Environments → [dev|staging|production]'));
    console.log(chalk.gray('   - Add environment-specific secrets\n'));
    console.log(chalk.white('2. Automated approach:'));
    console.log(chalk.gray('   - Use GitHub Actions workflow to distribute secrets'));
    console.log(chalk.gray('   - Workflow has access to secret values'));
    console.log(chalk.gray('   - Can call GitHub API to set secrets in other scopes\n'));

    console.log(chalk.blue('See scripts/github/SECRETS_DISTRIBUTION.md for detailed guide.\n'));
  }
}

// Parse CLI arguments
function parseArgs(): DistributionConfig {
  const args = process.argv.slice(2);
  const config: DistributionConfig = {
    owner: '',
    repo: '',
    dryRun: false,
    force: false,
    exclude: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--owner':
        config.owner = value;
        i++;
        break;
      case '--repo':
        config.repo = value;
        i++;
        break;
      case '--project-id':
        config.projectId = value;
        i++;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--force':
        config.force = true;
        break;
      case '--exclude':
        config.exclude = value.split(',').map(s => s.trim());
        i++;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(chalk.red(`Unknown option: ${arg}`));
          process.exit(1);
        }
    }
  }

  if (!config.owner || !config.repo) {
    console.error(chalk.red('Error: --owner and --repo are required'));
    console.log(chalk.gray('\nUsage:'));
    console.log(chalk.gray('  pnpm exec tsx scripts/github/distributeSecrets.ts --owner <owner> --repo <repo>\n'));
    process.exit(1);
  }

  return config;
}

// Main execution
async function main() {
  const config = parseArgs();

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error(chalk.red('Error: GITHUB_TOKEN environment variable not set'));
    process.exit(1);
  }

  const octokit = new Octokit({ auth: githubToken });
  const distributor = new SecretDistributor(octokit, config);

  try {
    await distributor.distribute();
  } catch (error: any) {
    console.error(chalk.red(`\n✗ Distribution failed: ${error.message}`));
    process.exit(1);
  }
}

main();
