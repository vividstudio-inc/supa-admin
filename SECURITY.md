# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security-sensitive findings.
2. Email or open a private security advisory via GitHub Security Advisories on [mizukendesu/supa-admin](https://github.com/mizukendesu/supa-admin/security/advisories).

We will acknowledge receipt and work on a fix. Please allow reasonable time before public disclosure.

## Sensitive data you manage

SupaAdmin stores **Target Supabase `service_role` keys** encrypted in the Meta database. You are responsible for:

- Generating and protecting `ENCRYPTION_KEY` (64-char hex, AES-256-GCM)
- Protecting `META_SUPABASE_SERVICE_ROLE_KEY` and `SETUP_SECRET`
- Rotating keys when team members leave or credentials may be compromised
- Restricting network access to your Meta and Target Supabase instances

SupaAdmin does not provide a managed secrets vault. Treat production deployments like any self-hosted system that holds privileged database credentials.

## Scope

Security reports should cover SupaAdmin application code in this repository. Issues in upstream dependencies (Supabase, Next.js, etc.) should be reported to those projects unless they are exploitable specifically through SupaAdmin's configuration or code.

## Supported versions

Security fixes are applied to the latest `main` branch. There are no long-term release branches at this time.
