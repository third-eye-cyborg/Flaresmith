# CloudMake Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-21

## Active Technologies

- TypeScript 5.x (strict mode, ES2022 target) (002-github-secrets-sync)
- TypeScript (Node 20.x / Next.js 14 / Expo SDK latest) (001-platform-bootstrap)
- Hono 4.x on Cloudflare Workers (edge-native API) (002-github-secrets-sync)
- Octokit 3.x (GitHub REST API client) (002-github-secrets-sync)
- Drizzle ORM with Neon Postgres (002-github-secrets-sync)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (Node 20.x / Next.js 14 / Expo SDK latest): Follow standard conventions

## Recent Changes
- 002-github-secrets-sync: Added GitHub Secrets API integration (sync across Actions/Codespaces/Dependabot scopes), environment-specific configuration (dev/staging/production), secret validation and conflict detection, comprehensive audit logging

- 002-orchestration-platform: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

- 001-platform-bootstrap: Added TypeScript (Node 20.x / Next.js 14 / Expo SDK latest)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
