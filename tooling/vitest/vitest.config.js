import { defineConfig } from "vitest/config";
import { coverageConfig } from "./coverage.js";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["../../tooling/vitest/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
    fileParallelism: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
    },
    coverage: coverageConfig,
  },
});
