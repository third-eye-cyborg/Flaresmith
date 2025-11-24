#!/bin/bash
#
# GitHub Secrets Distribution via GH CLI
# 
# This script uses `gh secret set` to distribute secrets from Actions
# to Codespaces and Environments.
#
# Prerequisites:
#   - gh CLI installed and authenticated
#   - Actions secrets already set in repository
#
# Usage:
#   ./scripts/github/distributeSecretsGH.sh
#
# Note: You'll be prompted to enter each secret value manually
# since GitHub API doesn't allow reading secret values.

set -e

REPO="third-eye-cyborg/Flaresmith"

echo "═══════════════════════════════════════════════════════════════════"
echo "🔐 GitHub Secrets Distribution (GH CLI)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Repository: $REPO"
echo ""

# List of secrets for Codespaces (dev tools)
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
  "ONESIGNAL_API_KEY"
  "ONESIGNAL_APP_ID"
  "SLACK_ACCESS_TOKEN"
  "SLACK_REFRESH_TOKEN"
  "POSTHOG_API_KEY"
)

# Environment-specific secrets
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

ENVIRONMENTS=("dev" "staging" "production")

# Function to set a Codespaces secret
set_codespaces_secret() {
  local secret_name=$1
  echo ""
  echo "📦 Setting Codespaces secret: $secret_name"
  read -sp "   Enter value for $secret_name: " secret_value
  echo ""
  
  if [ -z "$secret_value" ]; then
    echo "   ⚠️  Skipped (empty value)"
    return
  fi
  
  echo "$secret_value" | gh secret set "$secret_name" --repo "$REPO" --app codespaces
  echo "   ✅ Set successfully"
}

# Function to set an environment secret
set_env_secret() {
  local env_name=$1
  local secret_name=$2
  echo ""
  echo "🌍 Setting $env_name environment secret: $secret_name"
  read -sp "   Enter value for $secret_name ($env_name): " secret_value
  echo ""
  
  if [ -z "$secret_value" ]; then
    echo "   ⚠️  Skipped (empty value)"
    return
  fi
  
  echo "$secret_value" | gh secret set "$secret_name" --repo "$REPO" --env "$env_name"
  echo "   ✅ Set successfully"
}

# Function to create environments
create_environments() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "🌍 Creating GitHub Environments"
  echo "═══════════════════════════════════════════════════════════════════"
  
  for env in "${ENVIRONMENTS[@]}"; do
    echo ""
    echo "Creating environment: $env"
    
    # Create environment using GitHub API via gh
    gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/$REPO/environments/$env" \
      -f "wait_timer=0" 2>/dev/null || echo "   (Environment may already exist)"
    
    echo "   ✅ Environment ready"
  done
}

# Main menu
echo "What would you like to distribute?"
echo ""
echo "1) Codespaces secrets only"
echo "2) Environment secrets only (will create environments)"
echo "3) Both Codespaces and Environment secrets"
echo "4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "📦 Distributing to Codespaces"
    echo "═══════════════════════════════════════════════════════════════════"
    
    for secret in "${CODESPACE_SECRETS[@]}"; do
      set_codespaces_secret "$secret"
    done
    
    echo ""
    echo "✅ Codespaces distribution complete!"
    ;;
    
  2)
    create_environments
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "🌍 Distributing to Environments"
    echo "═══════════════════════════════════════════════════════════════════"
    
    for env in "${ENVIRONMENTS[@]}"; do
      echo ""
      echo "───────────────────────────────────────────────────────────────────"
      echo "Environment: $env"
      echo "───────────────────────────────────────────────────────────────────"
      
      for secret in "${ENV_SECRETS[@]}"; do
        set_env_secret "$env" "$secret"
      done
    done
    
    echo ""
    echo "✅ Environment distribution complete!"
    ;;
    
  3)
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "📦 Distributing to Codespaces"
    echo "═══════════════════════════════════════════════════════════════════"
    
    for secret in "${CODESPACE_SECRETS[@]}"; do
      set_codespaces_secret "$secret"
    done
    
    create_environments
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "🌍 Distributing to Environments"
    echo "═══════════════════════════════════════════════════════════════════"
    
    for env in "${ENVIRONMENTS[@]}"; do
      echo ""
      echo "───────────────────────────────────────────────────────────────────"
      echo "Environment: $env"
      echo "───────────────────────────────────────────────────────────────────"
      
      for secret in "${ENV_SECRETS[@]}"; do
        set_env_secret "$env" "$secret"
      done
    done
    
    echo ""
    echo "✅ All distributions complete!"
    ;;
    
  4)
    echo "Exiting..."
    exit 0
    ;;
    
  *)
    echo "Invalid choice. Exiting..."
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "📊 Summary"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "All secrets have been distributed!"
echo ""
echo "Verify your secrets:"
echo "  - Codespaces: https://github.com/$REPO/settings/secrets/codespaces"
echo "  - Environments: https://github.com/$REPO/settings/environments"
echo ""
