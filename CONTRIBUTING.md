# Contributing to CloudMake

Thank you for your interest in contributing to CloudMake! This guide will help you understand our spec-first development workflow.

## Spec-First Development Workflow

**All material changes to CloudMake originate from feature specifications.** Never start with code—always start with a spec.

### 1. Create or Update Specification

Feature specifications live in `specs/[###-feature]/`:

```
specs/001-platform-bootstrap/
├── spec.md              # Feature requirements and user stories
├── plan.md              # Technical implementation plan
├── data-model.md        # Entity definitions and relationships
├── research.md          # Technical decisions and alternatives
├── quickstart.md        # Integration examples
├── tasks.md             # Granular task breakdown
└── contracts/           # API contracts (OpenAPI)
    └── openapi.yaml
```

**Workflow**:
1. Read existing spec files to understand feature scope
2. Propose changes in spec.md (user stories, requirements, success criteria)
3. Get spec approved before writing any code
4. Use `/speckit.plan` to generate technical plan
5. Use `/speckit.tasks` to break down into implementation tasks

### 2. Generate Code from Specs

CloudMake uses automated code generation:

```bash
# Generate Zod schemas, Drizzle models, routes from spec
pnpm exec ts-node scripts/spec/apply.ts --project <projectId>
```

Generated artifacts:
- `packages/types/src/` - Zod schemas for validation
- `apps/api/db/schema/` - Drizzle ORM models
- `apps/api/src/routes/` - Hono API route stubs
- `mcp/servers/` - MCP tool descriptors
- Postman collections

### 3. Implement Generated Stubs

Fill in generated stubs with business logic, always referencing the spec:

```typescript
// Generated stub (DO NOT MODIFY SIGNATURE):
export async function createProject(req: CreateProjectRequest): Promise<CreateProjectResponse> {
  // TODO: Implement provisioning logic (see spec.md FR-001)
}

// Your implementation:
export async function createProject(req: CreateProjectRequest): Promise<CreateProjectResponse> {
  // FR-001: Create GitHub repo from template
  const repo = await githubService.createRepo({...});
  
  // FR-003: Provision Codespace
  const codespace = await githubService.createCodespace({...});
  
  // ... (trace to spec requirements)
}
```

### 4. Write Tests Matching Acceptance Criteria

Each user story has acceptance scenarios. Write tests that validate them:

```typescript
// From spec.md User Story 1, Acceptance Scenario 1:
test("creates project with all integrations enabled", async () => {
  const project = await createProject({
    name: "test-project",
    integrations: { github: true, neon: true, cloudflare: true },
  });
  
  expect(project.status).toBe("active");
  expect(project.integrations.githubRepo).toBeDefined();
  // ... validate all acceptance criteria
});
```

### 5. Submit Pull Request

**PR Description Template**:

```markdown
## Spec Reference
- Spec: `specs/001-platform-bootstrap/spec.md`
- Requirements: FR-001, FR-003, FR-004
- User Stories: US1
- Success Criteria: SC-001 (provisioning < 90s p95)

## Implementation Summary
[Brief description of changes]

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Acceptance criteria validated
- [x] Performance benchmarks met

## Checklist
- [x] Code traces to spec requirements (comments reference FR-###)
- [x] No secrets in logs (validated with pre-commit hook)
- [x] Zod schemas match spec entities
- [x] OpenAPI contract updated
- [x] MCP tool descriptors synced
```

## Development Setup

```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
```

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types
- **Formatting**: Prettier with 100-character line width
- **Linting**: ESLint with recommended TypeScript rules
- **Naming**: 
  - Files: kebab-case (`project-service.ts`)
  - Types: PascalCase (`ProjectService`)
  - Functions: camelCase (`createProject`)
  - Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

## Commit Messages

Follow conventional commits:

```
feat(projects): implement GitHub repo provisioning (FR-001)
fix(environments): correct environment status aggregation (FR-007)
docs(readme): update quick start guide
test(projects): add idempotency convergence tests (SC-004)
```

## Architecture Principles

Refer to `.specify/memory/constitution.md` for core principles:

1. **Spec-First Orchestration**: All code must trace to spec requirements
2. **Environment Parity**: Dev/staging/prod consistency
3. **Tool-/MCP-Centric AI Workflow**: AI interactions via MCP tools
4. **Security, Observability & Audit**: No secrets in logs, structured logging, audit trails
5. **Monorepo Simplicity**: Shared packages for reusable primitives

## Questions?

- Open a GitHub Discussion for clarifications
- Review existing specs in `specs/` for examples
- Check `specs/001-platform-bootstrap/quickstart.md` for integration examples
