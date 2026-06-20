import { describe, expect, it } from "vitest";
import { sanitizePostgrestFilter } from "../src/postgrest";

describe("sanitizePostgrestFilter", () => {
  it("removes PostgREST filter metacharacters", () => {
    expect(sanitizePostgrestFilter("hello,foo.eq.1")).toBe("hellofooeq1");
    expect(sanitizePostgrestFilter("a(b)%c.d\\e")).toBe("abcde");
  });

  it("preserves normal search text", () => {
    expect(sanitizePostgrestFilter("hello world")).toBe("hello world");
  });
});
