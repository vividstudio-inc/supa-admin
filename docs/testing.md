# Testing

## Unit tests

Pure functions (crypto, `generateRlsSql`, `mergePermissions`, URL validation) are tested with Vitest without a database.

## Database tests

- Use Meta Supabase local stack on port **54322**.
- Wrap tests in `withRollbackTx` so each test runs in a transaction that rolls back.
- Run with `pnpm test` (starts Meta if needed), `pnpm test:turbo`, or `pnpm test:coverage`.

## Coverage

- Local: `pnpm test:coverage` (requires Meta Supabase on port **54322**)
- Generates `lcov.info` under `packages/**/coverage/` via shared Vitest config
- CI uploads reports to [Codecov](https://codecov.io/gh/mizukendesu/supa-admin) after `pnpm test:coverage`

## CI

GitHub Actions runs `supabase db reset` before `pnpm test:coverage` with `TEST_DATABASE_URL` pointing at the local Meta Postgres instance. Coverage is uploaded via `codecov/codecov-action` using the `CODECOV_TOKEN` secret.

## Environment

Tests require:

- `TEST_DATABASE_URL` or `DATABASE_URL` → `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `ENCRYPTION_KEY` → 64-character hex string (AES-256-GCM)
