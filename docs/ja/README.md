# SupaAdmin（日本語）

[English README](../../README.md)

## 概要

SupaAdmin は、複数の Supabase プロジェクト（Target）を 1 つの管理画面から運用するためのセルフホスト型 admin パネルです。ユーザー・接続・RBAC は Meta Supabase に保持し、Target への CRUD はブラウザの Supabase クライアントで直接行います。

Supabase Dashboard との主な違い:

- 複数 Target を横断して管理できる
- チーム向け RBAC（接続・テーブル単位の権限）
- Target の `service_role` を Meta DB に暗号化保存（自己管理）

## クイックスタート

**前提**: Docker Desktop、Supabase CLI、Node 22.18+、pnpm 9.15+

```bash
corepack enable
pnpm install
pnpm db:start          # Meta (5432x) + Target (5442x)
pnpm setup:local       # env + reset + seed
pnpm dev               # http://127.0.0.1:3000
```

## 二段階認証

1. **Meta ログイン** — Supabase Auth（Meta プロジェクト）
2. **Target セッション** — 接続先ごとにブラウザ Supabase クライアントで認証

## セキュリティ

Target の `service_role` キーは Meta DB に AES-256-GCM で暗号化して保存します。本番運用では `ENCRYPTION_KEY` と `SETUP_SECRET` を安全に管理してください。詳細は [SECURITY.md](../../SECURITY.md) を参照。

## ドキュメント

- [Architecture](../architecture.md)
- [Coding Standards](../coding-standards.md)
- [Testing](../testing.md)
- [Contributing](../../CONTRIBUTING.md)

## スコープ外

- Managed SaaS ホスティング
- Realtime サブスクリプション UI
- Supabase 以外のデータベース
