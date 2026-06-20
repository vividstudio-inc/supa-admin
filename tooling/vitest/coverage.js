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
    "components/auth/logout-button.tsx",

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

    "**/*.d.ts",
    "node_modules/**",
    "dist/**",
    ".next/**",
  ],
};
