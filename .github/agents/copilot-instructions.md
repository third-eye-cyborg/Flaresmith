# CloudMake Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-21

## Active Technologies

- TypeScript 5.x (strict mode, ES2022 target) (002-github-secrets-sync)
- TypeScript (Node 20.x / Next.js 14 / Expo SDK latest) (001-platform-bootstrap)
- Hono 4.x on Cloudflare Workers (edge-native API) (002-github-secrets-sync)
- Octokit 3.x (GitHub REST API client) (002-github-secrets-sync)
- Drizzle ORM with Neon Postgres (002-github-secrets-sync)
 - TypeScript (Node 20+ Workers) + React Native (Expo SDK 51+) (003-neon-auth-migration)
 - Hono (Cloudflare Workers) + Drizzle + Neon serverless driver, expo-auth-session, expo-secure-store, Zod (003-neon-auth-migration)

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

- 003-neon-auth-migration: Added Neon-backed auth (users/sessions/provider links) with Expo mobile OAuth (Apple/Google/GitHub) and Email+Password; sessions ~15m access + 24h refresh; secure storage via expo-secure-store; Hono routes for register/login/refresh/oauthCallback.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
