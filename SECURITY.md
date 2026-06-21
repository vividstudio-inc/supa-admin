# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security-sensitive findings.
2. Email or open a private security advisory via GitHub Security Advisories on [vividstudio-inc/supa-admin](https://github.com/vividstudio-inc/supa-admin/security/advisories).

We will acknowledge receipt and work on a fix. Please allow reasonable time before public disclosure.

## Sensitive data you manage

SupaAdmin stores **Target Supabase `service_role` keys** encrypted in the Meta database. You are responsible for:

- Generating and protecting `ENCRYPTION_KEY` (64-char hex, AES-256-GCM)
- Protecting `META_SUPABASE_SERVICE_ROLE_KEY` and `SETUP_SECRET`
- Rotating keys when team members leave or credentials may be compromised
- Restricting network access to your Meta and Target Supabase instances

SupaAdmin does not provide a managed secrets vault. Treat production deployments like any self-hosted system that holds privileged database credentials.

## Rate limiting and authentication

- **Meta login** (`signInWithPassword`) goes directly to Supabase Auth from the browser. Configure brute-force protection in Supabase Dashboard → Auth → Rate Limits.
- **App endpoints** (`setup.createAdmin`, oRPC, `/setup` page) are rate-limited via Redis (Upstash in production).
- **Target anon keys** passed to client components follow Supabase's standard pattern; mitigate XSS with CSP (nonce on scripts) and never log keys.

## Target RPC security

Bootstrap uses `supaadmin_bootstrap(tables[])` and RLS sync uses `supaadmin_apply_rls_sql(sql)` with an in-database allowlist. Do not expose Target `service_role` keys in client code or logs.

## Scope

Security reports should cover SupaAdmin application code in this repository. Issues in upstream dependencies (Supabase, Next.js, etc.) should be reported to those projects unless they are exploitable specifically through SupaAdmin's configuration or code.

## Supported versions

Security fixes are applied to the latest `main` branch and the latest release tag (e.g. `v0.1.0`). There are no long-term release branches at this time.
