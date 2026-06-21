# Testing

## Unit tests

Pure functions (crypto, `generateRlsSql`, permission merge, URL validation) are tested with Vitest without a database.

## Database tests

- Use Meta Supabase local stack on port **54322** (Postgres) and **54321** (API).
- Wrap Drizzle-based tests in `withRollbackTx` from `@supa-admin/vitest-config/setup`.
- Repository integration: `packages/shared/repository-kit/__tests__/*integration*.test.ts`.
- Supabase integration tests seed data via the service role client; CI runs `supabase db reset` before coverage.
- Run with `pnpm test` (starts Meta if needed), `pnpm test:turbo`, or `pnpm test:coverage`.

## Architecture tests

- `pnpm lint:arch` — dependency-cruiser (package/layer boundaries).
- `pnpm architecture-check` — grep harness for app/** and components/** patterns.
- `scripts/__tests__/architecture-check.test.ts` — fixture violations must fail the check.

## Coverage

- Local: `pnpm test:coverage` (requires Meta Supabase on port **54322**)
- Generates `lcov.info` under `packages/**/coverage/` and `apps/web/coverage/`
- CI uploads reports to [Codecov](https://codecov.io/gh/vividstudio-inc/supa-admin)
- **Project target:** 80% (see `codecov.yml`). Patch coverage on changed lines: 80%.

Coverage excludes thin barrels (`index.ts` re-exports), Drizzle DDL (`packages/shared/db/src/schema/**`), framework glue (Supabase/Next client factories), shadcn `components/ui/**`, and presentation-only apps/web surfaces (`components/patterns/**`, connection table/list wrappers). Vitest `tooling/vitest/coverage.js` is SSOT; `codecov.yml` mirrors the same paths.

### Test file layout

| Area | Location |
|------|----------|
| Shared packages | `packages/shared/<pkg>/__tests__/**/*.test.ts` |
| Features | `packages/features/<feature>/__tests__/**/*.test.ts` |
| Workflows | `packages/workflows/__tests__/**/*.test.ts` |
| oRPC handlers | `apps/web/lib/orpc/__tests__/**/*.test.ts` |
| Webhook routes | `apps/web/lib/webhooks/__tests__/**/*.test.ts` (covers `app/api/webhooks` handlers) |
| Critical UI | `apps/web/components/**/__tests__/**/*.test.tsx` (`@vitest-environment jsdom`) |
| Middleware | `apps/web/middleware.test.ts` |

## CI

GitHub Actions runs `pnpm lint`, `pnpm lint:arch`, `pnpm architecture-check`, then `supabase db reset` before `pnpm test:coverage`.

## Environment

Tests require:

- `TEST_DATABASE_URL` or `DATABASE_URL` → `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `NEXT_PUBLIC_META_SUPABASE_URL` → `http://127.0.0.1:54321`
- `NEXT_PUBLIC_META_SUPABASE_ANON_KEY` / `META_SUPABASE_SERVICE_ROLE_KEY` → local Supabase JWT keys
- `ENCRYPTION_KEY` → 64-character hex string (AES-256-GCM)
- `SETUP_SECRET` → min 32 characters (handler tests)
- `SKIP_ENV_VALIDATION=true` → optional, set automatically in Vitest setup

Defaults for the above are applied in `tooling/vitest/setup.ts` when unset.
