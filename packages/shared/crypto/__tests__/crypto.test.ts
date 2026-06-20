import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decrypt, encrypt } from "../src/index.js";

const TEST_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("crypto", () => {
  it("when valid key, then round-trips encrypt/decrypt", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const plaintext = "secret-service-role-key";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("when ENCRYPTION_KEY missing, then throws", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string",
    );
  });

  it("when ENCRYPTION_KEY wrong length, then throws", () => {
    process.env.ENCRYPTION_KEY = "abc";
    expect(() => encrypt("x")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string",
    );
  });

  it("when ciphertext tampered, then decrypt throws", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const ciphertext = encrypt("secret");
    const buf = Buffer.from(ciphertext, "base64");
    buf[buf.length - 1] ^= 0xff;
    expect(() => decrypt(buf.toString("base64"))).toThrow();
  });

  it("when empty plaintext, then round-trips", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    expect(decrypt(encrypt(""))).toBe("");
  });
});
