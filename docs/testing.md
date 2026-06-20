# Testing

## Unit tests

Pure functions (crypto, `generateRlsSql`, permission merge, URL validation) are tested with Vitest without a database.

## Database tests

- Use Meta Supabase local stack on port **54322** (Postgres) and **54321** (API).
- Wrap Drizzle-based tests in `withRollbackTx` so each test runs in a transaction that rolls back.
- Supabase integration tests seed data via the service role client; CI runs `supabase db reset` before coverage.
- Run with `pnpm test` (starts Meta if needed), `pnpm test:turbo`, or `pnpm test:coverage`.

## Coverage

- Local: `pnpm test:coverage` (requires Meta Supabase on port **54322**)
- Generates `lcov.info` under `packages/**/coverage/` and `apps/web/coverage/` via shared Vitest config
- CI uploads reports to [Codecov](https://codecov.io/gh/mizukendesu/supa-admin) after `pnpm test:coverage`
- **Excluded from coverage:** `components/ui/**`, `packages/shared/ui/**`, thin page wrappers (`app/**`), i18n/hooks, presentation-heavy components (data-table, dynamic-form, layout, roles/users managers), **re-export barrels** (`apps/web/lib/{crypto,permissions,rls,schema,supabase,types,utils}`), **env bootstrap** (`lib/env.ts`), **oRPC wiring** (`lib/orpc/router.ts`, `lib/orpc/client.browser.ts`), **Supabase/Next client factories** (`auth/meta-*.ts`, `auth/server.ts`), and test support code (`**/__tests__/**`). Critical auth/connection forms and server logic remain in scope.
- **Project target:** 80% (see `codecov.yml`). Patch coverage on changed lines: 80%.

### Test file layout

| Area | Location |
|------|----------|
| Shared packages | `packages/shared/<pkg>/__tests__/**/*.test.ts` |
| oRPC handlers | `apps/web/lib/orpc/__tests__/**/*.test.ts` |
| Critical UI | `apps/web/components/**/__tests__/**/*.test.tsx` (use `@vitest-environment jsdom`) |
| Middleware | `apps/web/middleware.test.ts` |

## CI

GitHub Actions runs `supabase db reset` before `pnpm test:coverage` with `TEST_DATABASE_URL` pointing at the local Meta Postgres instance and standard local Supabase API keys. Coverage is uploaded via `codecov/codecov-action` using the `CODECOV_TOKEN` secret.

## Environment

Tests require:

- `TEST_DATABASE_URL` or `DATABASE_URL` → `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `NEXT_PUBLIC_META_SUPABASE_URL` → `http://127.0.0.1:54321`
- `NEXT_PUBLIC_META_SUPABASE_ANON_KEY` / `META_SUPABASE_SERVICE_ROLE_KEY` → local Supabase JWT keys
- `ENCRYPTION_KEY` → 64-character hex string (AES-256-GCM)
- `SETUP_SECRET` → min 32 characters (handler tests)
- `SKIP_ENV_VALIDATION=true` → optional, set automatically in Vitest setup

Defaults for the above are applied in `tooling/vitest/setup.ts` when unset.
