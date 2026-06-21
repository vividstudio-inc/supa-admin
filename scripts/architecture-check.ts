import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export type ArchitectureRule = "A1" | "A2" | "A3" | "A4" | "A5" | "A6";

export interface ArchitectureViolation {
  rule: ArchitectureRule;
  file: string;
  line: number;
  snippet: string;
  message: string;
}

export interface ArchitectureCheckOptions {
  rootDir?: string;
  enabledChecks?: ArchitectureRule[];
}

const DEFAULT_CHECKS: ArchitectureRule[] = ["A1", "A2", "A3", "A4", "A6"];

const RULE_DESCRIPTIONS: Record<ArchitectureRule, string> = {
  A1: "apps/web/app must not call createMetaServerClient, createMetaServiceClient, or Supabase .from() (auth login pages exempt)",
  A2: "apps/web/components must not import @supa-admin/feature-* or @supa-admin/workflows",
  A3: "apps/web/components must not import @supa-admin/rls",
  A4: "apps/web may import @supa-admin/repository-kit only from lib/orpc and app/api",
  A5: "supabase/migrations must not contain hand-written SQL (enforced by lefthook at commit time)",
  A6: "apps/web/middleware.ts must import @supa-admin/rate-limit/edge (not the Node redis entry)",
};

function collectFiles(
  rootDir: string,
  predicate: (relativePath: string) => boolean,
): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "coverage"
      ) {
        continue;
      }

      const absolutePath = join(currentDir, entry.name);
      const relativePath = relative(rootDir, absolutePath);

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        continue;
      }

      if (predicate(relativePath)) {
        results.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return results;
}

function findPatternViolations(
  files: string[],
  rule: ArchitectureRule,
  patterns: RegExp[],
  message: string,
  rootDir: string,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      for (const pattern of patterns) {
        if (!pattern.test(line)) {
          continue;
        }

        violations.push({
          rule,
          file: relative(rootDir, filePath),
          line: index + 1,
          snippet: line.trim(),
          message,
        });
      }
    }
  }

  return violations;
}

function isAuthLoginPage(relativePath: string): boolean {
  return relativePath.includes("/(auth)/login/");
}

export function checkA1(rootDir: string): ArchitectureViolation[] {
  const appDir = join(rootDir, "apps/web/app");
  if (!statSync(appDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files = collectFiles(
    appDir,
    (relativePath) => !isAuthLoginPage(relativePath),
  );

  return findPatternViolations(
    files,
    "A1",
    [/createMetaServerClient/, /createMetaServiceClient/, /\.from\s*\(\s*["']/],
    RULE_DESCRIPTIONS.A1,
    rootDir,
  );
}

export function checkA2(rootDir: string): ArchitectureViolation[] {
  const componentsDir = join(rootDir, "apps/web/components");
  if (!statSync(componentsDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files = collectFiles(componentsDir, () => true);

  return findPatternViolations(
    files,
    "A2",
    [/@supa-admin\/feature-/, /@supa-admin\/workflows/],
    RULE_DESCRIPTIONS.A2,
    rootDir,
  );
}

export function checkA3(rootDir: string): ArchitectureViolation[] {
  const componentsDir = join(rootDir, "apps/web/components");
  if (!statSync(componentsDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files = collectFiles(componentsDir, () => true);

  return findPatternViolations(
    files,
    "A3",
    [/from\s+["']@supa-admin\/rls["']/],
    RULE_DESCRIPTIONS.A3,
    rootDir,
  );
}

export function checkA4(rootDir: string): ArchitectureViolation[] {
  const webDir = join(rootDir, "apps/web");
  if (!statSync(webDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files = collectFiles(webDir, (relativePath) => {
    const normalized = relativePath.replaceAll("\\", "/");
    if (normalized.startsWith("lib/orpc/")) {
      return false;
    }
    if (normalized.startsWith("app/api/")) {
      return false;
    }
    return true;
  });

  return findPatternViolations(
    files,
    "A4",
    [/from\s+["']@supa-admin\/repository-kit["']/],
    RULE_DESCRIPTIONS.A4,
    rootDir,
  );
}

const DRIZZLE_MIGRATION_MARKER = "--> statement-breakpoint";

export function checkA5(rootDir: string): ArchitectureViolation[] {
  const migrationsDir = join(rootDir, "supabase/migrations");
  if (!statSync(migrationsDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const violations: ArchitectureViolation[] = [];

  for (const entry of readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".sql")) {
      continue;
    }

    const filePath = join(migrationsDir, entry.name);
    const content = readFileSync(filePath, "utf8");
    if (content.includes(DRIZZLE_MIGRATION_MARKER)) {
      continue;
    }

    violations.push({
      rule: "A5",
      file: relative(rootDir, filePath),
      line: 1,
      snippet: entry.name,
      message: RULE_DESCRIPTIONS.A5,
    });
  }

  return violations;
}

export function checkA6(rootDir: string): ArchitectureViolation[] {
  const middlewarePath = join(rootDir, "apps/web/middleware.ts");
  if (!statSync(middlewarePath, { throwIfNoEntry: false })?.isFile()) {
    return [];
  }

  const content = readFileSync(middlewarePath, "utf8");
  const violations: ArchitectureViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/from\s+["']@supa-admin\/rate-limit["']/.test(line)) {
      violations.push({
        rule: "A6",
        file: relative(rootDir, middlewarePath),
        line: index + 1,
        snippet: line.trim(),
        message: RULE_DESCRIPTIONS.A6,
      });
    }
  }

  const edgeEntryPath = join(rootDir, "packages/shared/rate-limit/src/edge.ts");
  if (statSync(edgeEntryPath, { throwIfNoEntry: false })?.isFile()) {
    const edgeContent = readFileSync(edgeEntryPath, "utf8");
    const edgeLines = edgeContent.split("\n");
    for (let index = 0; index < edgeLines.length; index += 1) {
      const line = edgeLines[index] ?? "";
      if (
        /from\s+["']redis["']/.test(line) ||
        /import\s*\(\s*["']redis["']\s*\)/.test(line)
      ) {
        violations.push({
          rule: "A6",
          file: relative(rootDir, edgeEntryPath),
          line: index + 1,
          snippet: line.trim(),
          message:
            "packages/shared/rate-limit/src/edge.ts must not import the Node redis package",
        });
      }
    }
  }

  return violations;
}

export function runArchitectureChecks(
  options: ArchitectureCheckOptions = {},
): ArchitectureViolation[] {
  const rootDir = options.rootDir ?? process.cwd();
  const enabledChecks = options.enabledChecks ?? DEFAULT_CHECKS;
  const violations: ArchitectureViolation[] = [];

  if (enabledChecks.includes("A1")) {
    violations.push(...checkA1(rootDir));
  }
  if (enabledChecks.includes("A2")) {
    violations.push(...checkA2(rootDir));
  }
  if (enabledChecks.includes("A3")) {
    violations.push(...checkA3(rootDir));
  }
  if (enabledChecks.includes("A4")) {
    violations.push(...checkA4(rootDir));
  }
  if (enabledChecks.includes("A5")) {
    violations.push(...checkA5(rootDir));
  }
  if (enabledChecks.includes("A6")) {
    violations.push(...checkA6(rootDir));
  }

  return violations;
}

export function formatViolations(violations: ArchitectureViolation[]): string {
  if (violations.length === 0) {
    return "Architecture check passed (A1-A4, A6; A5 skipped — lefthook handles migrations at commit time).";
  }

  return violations
    .map(
      (violation) =>
        `[${violation.rule}] ${violation.file}:${violation.line} — ${violation.message}\n  ${violation.snippet}`,
    )
    .join("\n\n");
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const violations = runArchitectureChecks();
  if (violations.length > 0) {
    console.error("Architecture check failed:\n");
    console.error(formatViolations(violations));
    process.exit(1);
  }

  console.log(formatViolations(violations));
}
