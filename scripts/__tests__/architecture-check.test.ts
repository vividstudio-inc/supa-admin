import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkA1,
  checkA2,
  checkA3,
  checkA4,
  checkA5,
  checkA6,
  runArchitectureChecks,
} from "../architecture-check";

function writeFixture(rootDir: string, relativePath: string, content: string) {
  const filePath = join(rootDir, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

describe("architecture-check", () => {
  let fixtureRoot = "";

  afterEach(() => {
    if (fixtureRoot) {
      rmSync(fixtureRoot, { recursive: true, force: true });
      fixtureRoot = "";
    }
  });

  it("A1 flags createMetaServerClient, createMetaServiceClient and Supabase .from() outside auth login", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a1-"));
    writeFixture(
      fixtureRoot,
      "apps/web/app/[locale]/roles/page.tsx",
      `import { createMetaServiceClient } from "@supa-admin/auth/server";\nawait service.from("connections");\n`,
    );
    writeFixture(
      fixtureRoot,
      "apps/web/app/[locale]/users/page.tsx",
      `import { createMetaServerClient } from "@supa-admin/auth/server";\n`,
    );
    writeFixture(
      fixtureRoot,
      "apps/web/app/[locale]/(auth)/login/page.tsx",
      `await service.from("profiles");\n`,
    );

    const violations = checkA1(fixtureRoot);

    expect(violations).toHaveLength(3);
    expect(violations.every((violation) => violation.rule === "A1")).toBe(true);
    expect(
      violations.some((violation) =>
        violation.file.includes("(auth)/login/page.tsx"),
      ),
    ).toBe(false);
  });

  it("A2 flags feature and workflow imports in components", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a2-"));
    writeFixture(
      fixtureRoot,
      "apps/web/components/example.tsx",
      `import { createConnection } from "@supa-admin/feature-connections";\nimport { getShellData } from "@supa-admin/workflows";\n`,
    );

    const violations = checkA2(fixtureRoot);

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.rule)).toEqual(["A2", "A2"]);
  });

  it("A3 flags @supa-admin/rls imports in components", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a3-"));
    writeFixture(
      fixtureRoot,
      "apps/web/components/example.tsx",
      `import { previewRlsSync } from "@supa-admin/rls";\n`,
    );

    const violations = checkA3(fixtureRoot);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("A3");
  });

  it("A4 allows repository-kit in lib/orpc but flags elsewhere in apps/web", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a4-"));
    writeFixture(
      fixtureRoot,
      "apps/web/lib/orpc/handlers/index.ts",
      `import { createDbContext } from "@supa-admin/repository-kit";\n`,
    );
    writeFixture(
      fixtureRoot,
      "apps/web/lib/shell-data.ts",
      `import { createDbContext } from "@supa-admin/repository-kit";\n`,
    );

    const violations = checkA4(fixtureRoot);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toContain("lib/shell-data.ts");
  });

  it("A5 flags hand-written migration SQL without Drizzle markers", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a5-"));
    writeFixture(
      fixtureRoot,
      "supabase/migrations/20250620100000_initial_schema.sql",
      "-- hand-written migration\nCREATE TABLE example (id uuid PRIMARY KEY);\n",
    );
    writeFixture(
      fixtureRoot,
      "supabase/migrations/20260621020637_eager_random.sql",
      'ALTER TABLE "connections" ADD COLUMN "bootstrap_status" text;--> statement-breakpoint\n',
    );

    const violations = checkA5(fixtureRoot);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toContain("initial_schema.sql");
  });

  it("A6 flags root rate-limit import in middleware and redis import in edge entry", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a6-"));
    writeFixture(
      fixtureRoot,
      "apps/web/middleware.ts",
      `import { checkRateLimit } from "@supa-admin/rate-limit";\n`,
    );
    writeFixture(
      fixtureRoot,
      "packages/shared/rate-limit/src/edge.ts",
      `import { createClient } from "redis";\n`,
    );

    const violations = checkA6(fixtureRoot);

    expect(violations).toHaveLength(2);
    expect(violations.every((violation) => violation.rule === "A6")).toBe(true);
  });

  it("runArchitectureChecks skips A5 by default", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-default-"));
    writeFixture(
      fixtureRoot,
      "supabase/migrations/20250620100000_initial_schema.sql",
      "-- hand-written migration\n",
    );

    const violations = runArchitectureChecks({ rootDir: fixtureRoot });

    expect(violations).toHaveLength(0);
  });

  it("runArchitectureChecks can enable A5 explicitly", () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "arch-check-a5-enabled-"));
    writeFixture(
      fixtureRoot,
      "supabase/migrations/20250620100000_initial_schema.sql",
      "-- hand-written migration\n",
    );

    const violations = runArchitectureChecks({
      rootDir: fixtureRoot,
      enabledChecks: ["A5"],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("A5");
  });
});
