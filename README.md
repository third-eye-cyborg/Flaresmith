# CloudMake

**Spec-first orchestration platform for multi-environment development workflows**

CloudMake provisions and synchronizes GitHub repos, Cloudflare Workers/Pages, Neon Postgres branches, and Postman collections—all driven by declarative specifications.

## Features

- 🚀 **Project Provisioning**: Create fully-configured projects with GitHub repos, Codespaces, database branches, and deployment pipelines
- 📊 **Environment Dashboard**: Monitor dev/staging/prod environments across all integrations in one view
- 🔄 **Spec-Driven Sync**: Automatically generate Zod schemas, Drizzle models, API routes, and Postman collections from spec files
- 💬 **AI Chat + Editor**: In-browser code editor with AI assistant that proposes spec-aware edits and commits to feature branches

## Quick Start

### Prerequisites

- Node.js 20.x or later
- pnpm 9.x or later
- GitHub account with repo/workflow/codespace/environment permissions
- Cloudflare account (Workers/Pages)
- Neon Postgres account
- Postman account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cloudmake.git
cd cloudmake

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development servers
pnpm dev
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
apps/
├── api/          # Hono backend on Cloudflare Workers + Drizzle ORM
├── web/          # Next.js 14 dashboard (App Router)
└── mobile/       # Expo mobile app (NativeWind)

packages/
├── types/        # Zod schemas (single source of truth)
├── api-client/   # Typed API wrapper with Zod validation
├── ui/           # Shared React Native primitives
├── utils/        # Hooks, helpers, env management
└── config/       # ESLint, Prettier, Tailwind, tsconfig bases

specs/            # Feature specifications (spec-first workflow)
mcp/              # MCP 2.0 tool descriptors for AI agents
scripts/          # CLI utilities (provision, spec-apply, security)
```

## Architecture

CloudMake follows a **spec-first** development model:

1. **Specifications First**: All features start in `/specs/[feature]/spec.md`
2. **Code Generation**: Zod schemas, DB models, API routes, and MCP tools are generated from specs
3. **Environment Parity**: Dev/staging/prod environments maintained consistently
4. **Idempotent Operations**: All provisioning is convergent and retryable

## Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Architecture Decision Records](./specs/)

## License

MIT © CloudMake
