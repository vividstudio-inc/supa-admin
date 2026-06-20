# Contributing to SupaAdmin

Thank you for your interest in contributing!

## Getting started

1. Fork the repository and clone your fork.
2. Install prerequisites: Docker Desktop, Supabase CLI, Node 22.18+, pnpm 9.15+.
3. Bootstrap locally:

```bash
corepack enable
pnpm install
pnpm db:start
pnpm setup:local
```

See [README.md](README.md) and [docs/](docs/) for architecture and testing conventions.

## Development workflow

1. Create a feature branch from `main`.
2. Make your changes.
3. Run checks before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test:turbo   # requires Meta Supabase on port 54322
```

4. Open a pull request against `main`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add connection health check
fix: handle RLS sync timeout
docs: update quick start
```

Lefthook enforces this format on commit.

## Pull requests

- Keep PRs focused — one logical change per PR when possible.
- Fill out the PR template checklist.
- Ensure CI passes (lint, typecheck, build, test).

## Database migrations

- Table definitions: edit Drizzle schema in `packages/shared/db`.
- Do **not** commit hand-written files under `supabase/migrations/` — lefthook blocks this.
- CI generates migrations via the `migrate-db` workflow (requires GitHub App secrets).

If you fork the repo, the `migrate-db` workflow is optional. Configure `DATABASE_URL` and related secrets only if you need automated migration generation on your fork.

## Documentation

Contributor docs live in static `docs/` — edit them directly. There is no code generation step.

## Questions

Open a [GitHub Issue](https://github.com/mizukendesu/supa-admin/issues) for bugs or feature requests.
