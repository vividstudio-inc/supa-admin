# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- DDD layering: `packages/features/*`, `packages/workflows`, `packages/shared/{ddd,errors,repository-kit}`
- Architecture harness: `pnpm lint:arch`, `pnpm architecture-check`, Constitution in docs
- CI schema sync webhook (`POST /api/webhooks/schema-sync`) with per-connection HMAC secrets
- User permission overrides UI and `access.*` oRPC procedures
- TanStack Query data layer for admin mutations (ConnectionList refresh)
- Server loaders (`apps/web/lib/server/loaders/`) replacing ShellExtrasContext

### Changed

- oRPC handlers split into thin adapters delegating to workflows/features
- Meta business persistence via Drizzle repository-kit (Supabase Auth session only exception)
- RSC pages use workflows/loaders instead of direct Supabase queries

## [0.1.0] - 2025-06-20

### Added

- Initial public release under Apache-2.0
- Self-hosted admin panel for multiple Target Supabase projects
- Two-stage authentication (Meta platform login + per-connection Target session)
- Dynamic CRUD with per-connection, per-table RBAC
- RLS sync preview and apply
- Encrypted storage of Target `service_role` keys in Meta DB
- Local dual-Supabase dev stack (Meta 5432x / Target 5442x)
- Docker Compose deployment
- Vercel deployment documentation
- ja/en i18n
- CI pipeline (lint, typecheck, build, test, Codecov)
- Contributor docs, security policy, and issue templates

[Unreleased]: https://github.com/vividstudio-inc/supa-admin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vividstudio-inc/supa-admin/releases/tag/v0.1.0
