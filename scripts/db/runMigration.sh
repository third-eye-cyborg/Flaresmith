#!/bin/bash
# T003: Run database migration across environments
# Usage: ./scripts/db/runMigration.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "🔄 Running migration 003-001-create-auth-tables for environment: $ENVIRONMENT"

# Load environment-specific DATABASE_URL
case $ENVIRONMENT in
  dev)
    if [ -z "$DEV_DATABASE_URL" ]; then
      echo "❌ DEV_DATABASE_URL not set"
      echo "Set it with: export DEV_DATABASE_URL='postgresql://user:pass@host/db?sslmode=require'"
      exit 1
    fi
    export DATABASE_URL=$DEV_DATABASE_URL
    ;;
  staging)
    if [ -z "$STAGING_DATABASE_URL" ]; then
      echo "❌ STAGING_DATABASE_URL not set"
      exit 1
    fi
    export DATABASE_URL=$STAGING_DATABASE_URL
    ;;
  prod)
    if [ -z "$PROD_DATABASE_URL" ]; then
      echo "❌ PROD_DATABASE_URL not set"
      exit 1
    fi
    export DATABASE_URL=$PROD_DATABASE_URL
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [dev|staging|prod]"
    exit 1
    ;;
esac

echo "📊 Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/@/g')"

cd "$(dirname "$0")/../../apps/api"

# Run migration
echo "🚀 Executing migration..."
pnpm db:migrate

echo "✅ Migration completed successfully for $ENVIRONMENT"
