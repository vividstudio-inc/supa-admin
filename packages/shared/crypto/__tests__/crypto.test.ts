import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decrypt, encrypt } from "../src/index";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("crypto", () => {
  it("round-trips encrypt/decrypt", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const plaintext = "secret-service-role-key";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});
