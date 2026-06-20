# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/mizukendesu/supa-admin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mizukendesu/supa-admin/releases/tag/v0.1.0
