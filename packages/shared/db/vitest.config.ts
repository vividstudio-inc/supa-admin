import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["__tests__/**/*.test.ts"],
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["node_modules/**", "dist/**"],
    },
  },
});
