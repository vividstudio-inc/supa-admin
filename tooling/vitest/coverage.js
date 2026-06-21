/** @type {import("vitest/config").CoverageV8Options} */
export const coverageConfig = {
  provider: "v8",
  reporter: ["text-summary", "lcov"],
  include: ["src/**/*.ts", "lib/**/*.ts", "app/**/*.ts", "components/**/*.tsx"],
  exclude: [
    // Test code
    "**/__tests__/**",
    "**/*.{test,spec}.{ts,tsx}",

    // Presentation / layout (not business logic)
    "**/components/ui/**",
    "packages/shared/ui/**",
    "app/**",
    "i18n/**",
    "hooks/**",
    "components/data-table/**",
    "components/dynamic-form/**",
    "components/json-editor/**",
    "components/layout/**",
    "components/locale-switcher.tsx",
    "components/roles/**",
    "components/users/**",
    "components/connections/connection-list.tsx",
    "components/connections/connection-table-list.tsx",
    "components/connections/connection-onboarding-wizard.tsx",
    "components/connections/target-setup-dialog.tsx",
    "components/connections/target-setup-panel.tsx",
    "components/auth/logout-button.tsx",
    "components/theme-provider.tsx",
    "components/theme-toggle.tsx",
    "components/providers/**",
    "components/patterns/**",

    // RSC loaders / data layer / webhooks (thin adapters)
    "lib/server/loaders/**",
    "lib/data-layer/**",
    "lib/webhooks/**",
    "lib/connection-bootstrap.ts",
    "lib/shell-data.ts",
    "lib/orpc/server-caller.ts",

    // apps/web barrels → logic lives in packages/shared/*
    "lib/crypto/**",
    "lib/schema/introspect.ts",
    "lib/types/**",
    "lib/permissions/**",
    "lib/rls/sync.ts",
    "lib/supabase/**",
    "lib/utils.ts",

    // Env bootstrap (validated at runtime; tests use SKIP_ENV_VALIDATION)
    "lib/env.ts",

    // oRPC wiring (handlers tested directly; browser client needs jsdom/E2E)
    "lib/orpc/router.ts",
    "lib/orpc/client.browser.ts",

    // Supabase / Next.js client factories (framework glue)
    "**/meta-client.ts",
    "**/meta-server.ts",
    "**/server.ts",
    "packages/shared/supabase-target/src/client.ts",

    // Drizzle DDL (client.ts stays in scope)
    "packages/shared/db/src/schema/**",

    // Thin DDD base classes
    "packages/shared/ddd/src/entity.ts",
    "packages/shared/ddd/src/aggregate-root.ts",

    // Type-only / error definitions
    "packages/workflows/src/internal/actor.ts",
    "packages/workflows/src/internal/errors.ts",

    // Thin barrels (re-exports only)
    "packages/features/*/src/index.ts",
    "packages/workflows/src/index.ts",
    "packages/shared/repository-kit/src/index.ts",
    "packages/shared/utils/src/index.ts",
    "packages/shared/errors/src/index.ts",
    "packages/shared/crypto/src/index.ts",

    "**/*.d.ts",
    "node_modules/**",
    "dist/**",
    ".next/**",
  ],
};
