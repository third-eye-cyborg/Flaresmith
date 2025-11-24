#!/bin/bash
#
# Automated GitHub Secrets Distribution from .env file
# 
# Reads secrets from .env and distributes to:
#   - GitHub Actions repository secrets
#   - GitHub Codespaces repository secrets
#   - GitHub Environments (dev, staging, production)
#   - Cloudflare Workers secrets
#
# Usage:
#   bash scripts/github/distributeFromEnv.sh
#

set -e

REPO="third-eye-cyborg/Flaresmith"
ENV_FILE=".env"

echo "═══════════════════════════════════════════════════════════════════"
echo "🔐 Automated Secret Distribution from .env"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Repository: $REPO"
echo "Source: $ENV_FILE"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  exit 1
fi

# Load .env file
set -a
source "$ENV_FILE"
set +a

echo "✓ Loaded secrets from $ENV_FILE"
echo ""

# Codespaces secrets (dev tools)
CODESPACE_SECRETS=(
  "EXPO_TOKEN"
  "FIGMA_API_KEY"
  "LINEAR_API_KEY"
  "MAPBOX_API_KEY"
  "NOTION_API_KEY"
  "OPENAI_API_KEY"
  "POSTMAN_API_KEY"
  "POLAR_API_KEY"
  "BUILDER_API_KEY"
  "CYPRESS_WEB_TOKEN"
  "CYPRESS_MOBILE_TOKEN"
  "PLAYWRIGHT_WEB_TOKEN"
  "PLAYWRIGHT_MOBILE_TOKEN"
  "STORYBOOK_WEB_TOKEN"
  "STORYBOOK_MOBILE_TOKEN"
)

# Actions secrets (all secrets for CI/CD)
ACTIONS_SECRETS=(
  "BUILDER_API_KEY"
  "CLOUDFLARE_ACCOUNT_ID"
  "CLOUDFLARE_API_KEY"
  "CYPRESS_MOBILE_TOKEN"
  "CYPRESS_WEB_TOKEN"
  "DATABASE_URL"
  "EXPO_TOKEN"
  "FIGMA_API_KEY"
  "LINEAR_API_KEY"
  "MAPBOX_API_KEY"
  "NEON_API_KEY"
  "NOTION_API_KEY"
  "ONESIGNAL_API_KEY"
  "ONESIGNAL_APP_ID"
  "OPENAI_API_KEY"
  "PLAYWRIGHT_MOBILE_TOKEN"
  "PLAYWRIGHT_WEB_TOKEN"
  "POLAR_API_KEY"
  "POSTHOG_API_KEY"
  "POSTMAN_API_KEY"
  "SLACK_ACCESS_TOKEN"
  "SLACK_REFRESH_TOKEN"
  "STORYBOOK_MOBILE_TOKEN"
  "STORYBOOK_WEB_TOKEN"
)

# Environment secrets (runtime for deployments)
ENV_SECRETS=(
  "DATABASE_URL"
  "CLOUDFLARE_ACCOUNT_ID"
  "CLOUDFLARE_API_KEY"
  "NEON_API_KEY"
  "OPENAI_API_KEY"
  "POSTHOG_API_KEY"
  "ONESIGNAL_API_KEY"
  "ONESIGNAL_APP_ID"
  "SLACK_ACCESS_TOKEN"
  "SLACK_REFRESH_TOKEN"
)

# Cloudflare Worker secrets
CLOUDFLARE_WORKER_SECRETS=(
  "DATABASE_URL"
  "OPENAI_API_KEY"
  "POSTHOG_API_KEY"
  "SLACK_ACCESS_TOKEN"
  "SLACK_REFRESH_TOKEN"
  "NEON_API_KEY"
)

ENVIRONMENTS=("dev" "staging" "production")

# ═══════════════════════════════════════════════════════════════════
# 1. GitHub Actions Repository Secrets
# ═══════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "1️⃣  Distributing to GitHub Actions Repository Secrets"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

for secret_name in "${ACTIONS_SECRETS[@]}"; do
  secret_value="${!secret_name}"
  
  if [ -z "$secret_value" ]; then
    echo "⚠️  Skipping $secret_name (not set in .env)"
    continue
  fi
  
  echo "✓ Setting Actions secret: $secret_name"
  echo "$secret_value" | gh secret set "$secret_name" --repo "$REPO"
done

echo ""
echo "✅ Actions secrets complete!"
echo ""

# ═══════════════════════════════════════════════════════════════════
# 2. GitHub Codespaces Repository Secrets
# ═══════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "2️⃣  Distributing to GitHub Codespaces Repository Secrets"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

for secret_name in "${CODESPACE_SECRETS[@]}"; do
  secret_value="${!secret_name}"
  
  if [ -z "$secret_value" ]; then
    echo "⚠️  Skipping $secret_name (not set in .env)"
    continue
  fi
  
  echo "✓ Setting Codespaces secret: $secret_name"
  echo "$secret_value" | gh secret set "$secret_name" --repo "$REPO" --app codespaces
done

echo ""
echo "✅ Codespaces secrets complete!"
echo ""

# ═══════════════════════════════════════════════════════════════════
# 3. GitHub Environments & Environment Secrets
# ═══════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "3️⃣  Creating GitHub Environments & Distributing Secrets"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

for env in "${ENVIRONMENTS[@]}"; do
  echo "───────────────────────────────────────────────────────────────────"
  echo "Environment: $env"
  echo "───────────────────────────────────────────────────────────────────"
  
  # Create environment
  echo "Creating environment: $env"
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/repos/$REPO/environments/$env" \
    -f "wait_timer=0" -F "prevent_self_review=false" 2>/dev/null || echo "  (Environment may already exist or needs manual creation)"
  
  echo ""
  
  # Set environment secrets
  for secret_name in "${ENV_SECRETS[@]}"; do
    secret_value="${!secret_name}"
    
    if [ -z "$secret_value" ]; then
      echo "⚠️  Skipping $secret_name (not set in .env)"
      continue
    fi
    
    echo "✓ Setting $env secret: $secret_name"
    echo "$secret_value" | gh secret set "$secret_name" --repo "$REPO" --env "$env"
  done
  
  echo ""
done

echo "✅ Environment secrets complete!"
echo ""

# ═══════════════════════════════════════════════════════════════════
# 4. Cloudflare Workers Secrets
# ═══════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "4️⃣  Distributing to Cloudflare Workers"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
  echo "⚠️  wrangler CLI not found - skipping Cloudflare secrets"
  echo "   Install with: pnpm add -g wrangler"
  echo ""
else
  # Check if we're in the API directory or need to navigate
  if [ -d "apps/api" ]; then
    cd apps/api
    
    for secret_name in "${CLOUDFLARE_WORKER_SECRETS[@]}"; do
      secret_value="${!secret_name}"
      
      if [ -z "$secret_value" ]; then
        echo "⚠️  Skipping $secret_name (not set in .env)"
        continue
      fi
      
      echo "✓ Setting Cloudflare Worker secret: $secret_name"
      echo "$secret_value" | pnpm wrangler secret put "$secret_name" 2>/dev/null || \
        echo "  ⚠️  Failed (check wrangler auth: pnpm wrangler login)"
    done
    
    cd ../..
    echo ""
    echo "✅ Cloudflare secrets complete!"
  else
    echo "⚠️  apps/api directory not found - skipping Cloudflare secrets"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "📊 Distribution Complete!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Secrets distributed to:"
echo "  ✅ GitHub Actions repository secrets (24 secrets)"
echo "  ✅ GitHub Codespaces repository secrets (15 secrets)"
echo "  ✅ GitHub Environments (dev, staging, production - 10 secrets each)"
echo "  ✅ Cloudflare Workers (6 secrets)"
echo ""
echo "Verify your secrets:"
echo "  • Actions: https://github.com/$REPO/settings/secrets/actions"
echo "  • Codespaces: https://github.com/$REPO/settings/secrets/codespaces"
echo "  • Environments: https://github.com/$REPO/settings/environments"
echo ""
echo "⚠️  IMPORTANT: Delete or gitignore your .env file to prevent leaking secrets!"
echo ""
