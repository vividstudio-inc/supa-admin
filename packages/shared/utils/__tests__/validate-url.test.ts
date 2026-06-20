import { describe, expect, it } from "vitest";
import { validateTargetUrl } from "../src/validate-url";

describe("validateTargetUrl", () => {
  it("accepts public HTTPS Supabase URLs", () => {
    expect(validateTargetUrl("https://abcxyz.supabase.co")).toEqual({
      ok: true,
    });
  });

  it("rejects HTTP URLs", () => {
    const result = validateTargetUrl("http://abcxyz.supabase.co");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("HTTPS");
    }
  });

  it("rejects localhost and private IPs", () => {
    for (const url of [
      "https://127.0.0.1",
      "https://localhost",
      "https://10.0.0.1",
      "https://192.168.1.1",
      "https://169.254.169.254",
    ]) {
      const result = validateTargetUrl(url);
      expect(result.ok).toBe(false);
    }
  });
});
