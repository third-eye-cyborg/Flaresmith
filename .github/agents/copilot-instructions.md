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
## Dual Auth & Multi-MCP (005-dual-auth-architecture)
Framework/Lib Stack Added:
- Next.js 14 (App Router, server components opportunistic)
- Expo Router + NativeWind (admin/user mobile route guards via token type)
- Hono (Cloudflare Workers) + Drizzle ORM + Neon HTTP driver (shared DB, RLS)
- Better Auth (standard user auth) + Neon Auth (admin auth) with strict token type separation
- Polar SDK (Hono server integration + mobile receipt validation flow)
- PostHog (feature flags + aggregate analytics; prod read-only MCP tools)
- Mapbox GL + Geocoding (hashed user tokens; style list cached 10m KV)
- OneSignal (admin-only segment creation + dispatch)
- Cloudflare Images (transform presets, enforced alt metadata) & Stream (5m playback tokens + denylist)
- MCP 2.0 multi-server descriptors: polar, better-auth, neon, cloudflare, github, postman, mapbox, onesignal, posthog, framework rules
Observability:
- Tables: mcp_tool_invocations, mcp_server_metrics, mcp_drift_snapshots
- Rate limiting token bucket 60/min burst 120 per server+actor (KV primary, Neon fallback)
Security:
- Salt+pepper hashing for Mapbox tokens; playback token TTL 5m; receipt validation server-side only
Environment Parity:
- Staging/Prod enforce MCP read-only (Neon writes, destructive Cloudflare, GitHub mutations blocked)
Graceful Degradation:
- Outage >60s triggers guidance + outage event logging
<!-- MANUAL ADDITIONS END -->
