import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_EDGE_BUNDLE_PATTERNS,
  scanEdgeBundleContent,
} from "../check-edge-bundle";

describe("check-edge-bundle", () => {
  it("when bundle contains node:url, then flags violation", () => {
    const violations = scanEdgeBundleContent(
      'require("node:url").URL',
      "edge.js",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain("url module");
  });

  it("when bundle contains local redis helper, then flags violation", () => {
    const violations = scanEdgeBundleContent(
      "async function getLocalRedis(){}",
      "edge.js",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain("Local Redis client");
  });

  it("when bundle is edge-safe upstash only, then passes", () => {
    const violations = scanEdgeBundleContent(
      'redis.call("ZRANGE", key, 0, -1)',
      "edge.js",
    );
    expect(violations).toHaveLength(0);
  });

  it("documents at least one forbidden pattern", () => {
    expect(FORBIDDEN_EDGE_BUNDLE_PATTERNS.length).toBeGreaterThan(0);
  });
});
