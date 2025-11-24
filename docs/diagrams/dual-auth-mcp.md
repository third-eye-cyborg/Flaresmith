# Dual Auth Architecture & Multi-MCP Ecosystem

**Placeholder for architecture diagram**

This diagram will illustrate:
- Physical app separation (admin-web, user-web, admin-mobile, user-mobile)
- Token type enforcement flow (JWT claim `type: admin|user`)
- MCP server integration boundaries (admin-only vs user-only vs shared)
- Database RLS policy layers
- Connection pool segmentation
- Billing isolation (Polar only accessible to user surfaces)

## Planned Content

### Diagram Components
1. **Four Frontend Surfaces**
   - Admin Web (Next.js + Neon Auth)
   - User Web (Next.js + Better Auth)
   - Admin Mobile (Expo + Neon Auth)
   - User Mobile (Expo + Better Auth + Polar)

2. **API Layer (Hono on Cloudflare Workers)**
   - Token Type Middleware
   - Rate Limiting (user/project buckets)
   - Audit Logging
   - MCP Orchestration

3. **Database Layer (Neon Postgres)**
   - RLS Policies (admin vs user scopes)
   - Connection Pool Segmentation
   - Session Tables (admin_sessions, user_sessions)
   - Audit Logs (admin_audit_logs)

4. **MCP Servers (10+ integrations)**
   - Admin-Only: GitHub, Cloudflare, Neon, Postman
   - User-Only: Polar, Better Auth
   - Shared: Mapbox, OneSignal, PostHog, Design System

5. **Security Boundaries**
   - Token claim validation (middleware blocks cross-boundary)
   - RLS enforcement (database rejects unauthorized queries)
   - Circuit breakers (graceful degradation on outages)

### Diagram Format Options
- **Mermaid**: Embedded in Markdown (renders on GitHub)
- **PNG/SVG**: Generated via draw.io or Excalidraw
- **ASCII**: Simple text-based representation

### Placeholder ASCII Representation

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND SURFACES                           │
├─────────────┬─────────────┬──────────────┬────────────────────┤
│  Admin Web  │  User Web   │ Admin Mobile │  User Mobile       │
│  (Neon Auth)│(Better Auth)│  (Neon Auth) │ (Better Auth)      │
│  No Billing │   + Polar   │  No Billing  │  + Polar (native)  │
└──────┬──────┴──────┬──────┴──────┬───────┴──────┬─────────────┘
       │             │              │              │
       └─────────────┴──────────────┴──────────────┘
                          │
                   JWT (type: admin|user)
                          │
       ┌──────────────────▼───────────────────┐
       │    API LAYER (Hono / Cloudflare)     │
       │  ┌────────────────────────────────┐  │
       │  │ Token Type Middleware          │  │
       │  │ - Validate claim.type          │  │
       │  │ - Block cross-boundary access  │  │
       │  └────────────────────────────────┘  │
       │  ┌────────────────────────────────┐  │
       │  │ Rate Limit & Audit Middleware  │  │
       │  └────────────────────────────────┘  │
       └──────────────┬───────────────────────┘
                      │
       ┌──────────────▼───────────────────────────────┐
       │         DATABASE (Neon Postgres)             │
       │  ┌───────────────────────────────────────┐   │
       │  │ RLS Policies                          │   │
       │  │ - admin_audit_logs (admin only)       │   │
       │  │ - user_sessions (user self-access)    │   │
       │  │ - polar_customers (user self-access)  │   │
       │  └───────────────────────────────────────┘   │
       │  ┌───────────────────────────────────────┐   │
       │  │ Connection Pools                      │   │
       │  │ - Reserved admin connections          │   │
       │  │ - User workload pools                 │   │
       │  └───────────────────────────────────────┘   │
       └──────────────────────────────────────────────┘

       ┌──────────────────────────────────────────────┐
       │         MCP SERVERS (10+ integrations)       │
       ├──────────────────┬───────────────────────────┤
       │  ADMIN-ONLY      │  USER-ONLY                │
       │  - GitHub        │  - Polar                  │
       │  - Cloudflare    │  - Better Auth            │
       │  - Neon          │                           │
       │  - Postman       │  SHARED (both)            │
       │                  │  - Mapbox                 │
       │                  │  - OneSignal              │
       │                  │  - PostHog                │
       │                  │  - Design System          │
       └──────────────────┴───────────────────────────┘

SECURITY LAYERS:
1. Token Type Enforcement (JWT claim validation)
2. RLS Policies (database-level access control)
3. Connection Pool Segmentation (resource isolation)
4. Circuit Breakers (graceful degradation)
5. Rate Limiting (token buckets per user/project)
```

### Future Enhancements
- Add sequence diagrams for auth flows (admin login + MFA, user OAuth)
- Visualize webhook flow (Polar → API → database → user session update)
- Show spec-first workflow (spec.md → code generation → deployment)
- Illustrate drift detection + CI blocking mechanism

**Status**: Placeholder created (T120)  
**Feature**: 005-dual-auth-architecture  
**Next Step**: Generate production diagram using Mermaid or draw.io post-MVP
