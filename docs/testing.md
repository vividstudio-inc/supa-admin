# Testing

## Unit tests

Pure functions (crypto, `generateRlsSql`, `mergePermissions`, URL validation) are tested with Vitest without a database.

## Database tests

- Use Meta Supabase local stack on port **54322**.
- Wrap tests in `withRollbackTx` so each test runs in a transaction that rolls back.
- Run with `pnpm test` (starts Meta if needed) or `pnpm test:turbo`.

## CI

GitHub Actions runs `supabase db reset` before `pnpm test:turbo` with `TEST_DATABASE_URL` pointing at the local Meta Postgres instance.

## Environment

Tests require:

- `TEST_DATABASE_URL` or `DATABASE_URL` → `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `ENCRYPTION_KEY` → 64-character hex string (AES-256-GCM)
