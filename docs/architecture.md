# Architecture

SupaAdmin is a Turborepo + pnpm monorepo scoped as `@supa-admin/*`.

## Core concepts

- **Meta DB**: Drizzle schema in `packages/shared/db` is the single source of truth. RLS policies and triggers live in SQL migrations under `supabase/migrations/`.
- **API**: oRPC only via `apps/web/app/api/rpc` — no REST routes.
- **Auth**: Supabase Auth on Meta. Target connections use a browser Supabase client (two-stage login).
- **Local dev**: Dual Supabase stacks — Meta on 5432x ports, Target on 5442x (+100 offset).

## Layering

```
apps/web/app          → UI (oRPC client for meta DB operations)
apps/web/lib/orpc     → handlers (use cases, auth)
packages/shared/*     → cross-cutting (crypto, rls, auth, schema, projections)
```

## Dependencies

- Shared packages must not import from apps.
- Server-only modules: crypto, auth/server, auth/permissions, schema, rls, supabase-target/admin.

## Dual Supabase model

| Stack | Purpose | Local ports |
|-------|---------|-------------|
| Meta (`supabase/`) | Users, connections, RBAC, encrypted target credentials | Studio 54323, API 54321, DB 54322 |
| Target (`supabase-target/`) | Sample schema for local development and RLS testing | Studio 54423, API 54421, DB 54422 |

Target Supabase projects are registered as connections in Meta. Service role keys are encrypted at rest in Meta using `ENCRYPTION_KEY`.
