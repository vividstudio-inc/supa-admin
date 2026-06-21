import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export interface EdgeBundleViolation {
  file: string;
  pattern: string;
  message: string;
}

/** Patterns that must not appear in Next.js Edge middleware bundles. */
export const FORBIDDEN_EDGE_BUNDLE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  message: string;
}> = [
  {
    pattern: /\bnode:url\b/,
    message: "Node.js url module is not supported in Edge Runtime",
  },
  {
    pattern: /\bnode:net\b/,
    message: "Node.js net module is not supported in Edge Runtime",
  },
  {
    pattern: /node_modules[/\\].*[/\\]redis[/\\]/,
    message: "Node redis package must not be bundled into Edge middleware",
  },
  {
    pattern: /\bgetLocalRedis\b/,
    message: "Local Redis client must not be used from Edge middleware",
  },
  {
    pattern: /\bcheckLocalRateLimit\b/,
    message: "Local Redis rate limit must not be used from Edge middleware",
  },
  {
    pattern: /import\s*\(\s*["']redis["']\s*\)/,
    message: "Dynamic import of redis must not be bundled into Edge middleware",
  },
];

export interface CheckEdgeBundleOptions {
  rootDir?: string;
  nextDir?: string;
}

export function scanEdgeBundleContent(
  content: string,
  fileLabel: string,
): EdgeBundleViolation[] {
  const violations: EdgeBundleViolation[] = [];

  for (const { pattern, message } of FORBIDDEN_EDGE_BUNDLE_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file: fileLabel, pattern: pattern.source, message });
    }
  }

  return violations;
}

export function checkEdgeMiddlewareBundle(
  options: CheckEdgeBundleOptions = {},
): EdgeBundleViolation[] {
  const rootDir = options.rootDir ?? process.cwd();
  const nextDir = options.nextDir ?? join(rootDir, "apps/web/.next");
  const manifestPath = join(nextDir, "server/middleware-manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing ${relative(rootDir, manifestPath)} — run pnpm build first`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    middleware?: Record<string, { files?: string[] }>;
  };

  const chunkPaths = new Set<string>();
  for (const entry of Object.values(manifest.middleware ?? {})) {
    for (const file of entry.files ?? []) {
      chunkPaths.add(join(nextDir, file));
    }
  }

  if (chunkPaths.size === 0) {
    throw new Error("middleware-manifest.json lists no Edge chunk files");
  }

  const violations: EdgeBundleViolation[] = [];

  for (const chunkPath of chunkPaths) {
    if (!existsSync(chunkPath) || chunkPath.endsWith(".map")) {
      continue;
    }

    const content = readFileSync(chunkPath, "utf8");
    violations.push(
      ...scanEdgeBundleContent(content, relative(rootDir, chunkPath)),
    );
  }

  return violations;
}

export function formatEdgeBundleViolations(
  violations: EdgeBundleViolation[],
): string {
  if (violations.length === 0) {
    return "Edge middleware bundle check passed.";
  }

  return violations
    .map(
      (violation) =>
        `${violation.file} — ${violation.message}\n  matched /${violation.pattern}/`,
    )
    .join("\n\n");
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const violations = checkEdgeMiddlewareBundle();
    if (violations.length > 0) {
      console.error("Edge middleware bundle check failed:\n");
      console.error(formatEdgeBundleViolations(violations));
      process.exit(1);
    }
    console.log(formatEdgeBundleViolations(violations));
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Edge middleware bundle check failed",
    );
    process.exit(1);
  }
}
