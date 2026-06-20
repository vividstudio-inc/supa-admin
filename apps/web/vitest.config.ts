import path from "node:path";
import { coverageConfig } from "@supa-admin/vitest-config/coverage";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "lib/**/__tests__/**/*.test.ts",
      "components/**/__tests__/**/*.test.tsx",
      "middleware.test.ts",
    ],
    setupFiles: ["../../tooling/vitest/setup.ts", "./vitest.setup.ts"],
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
    },
    coverage: coverageConfig,
    server: {
      deps: {
        inline: ["next", "next-intl"],
      },
    },
  },
});
