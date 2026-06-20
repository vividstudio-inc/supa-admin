import { describe, expect, it } from "vitest";
import type { z } from "zod/v3";

describe("orpc contract schemas", () => {
  it("when setup createAdmin input invalid email, then fails", async () => {
    const { setupContract } = await import("../src/index.js");
    const schema = setupContract.createAdmin["~orpc"].inputSchema as z.ZodType;
    expect(
      schema.safeParse({
        email: "not-email",
        password: "password123",
        displayName: "Admin",
        setupSecret:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      }).success,
    ).toBe(false);
  });

  it("when setup createAdmin input valid, then passes", async () => {
    const { setupContract } = await import("../src/index.js");
    const schema = setupContract.createAdmin["~orpc"].inputSchema as z.ZodType;
    expect(
      schema.safeParse({
        email: "admin@example.com",
        password: "password123",
        displayName: "Admin",
        setupSecret:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("when connection create input missing url, then fails", async () => {
    const { connectionsContract } = await import("../src/index.js");
    const schema = connectionsContract.create["~orpc"].inputSchema as z.ZodType;
    expect(
      schema.safeParse({
        name: "Test",
        anonKey: "key",
        serviceRoleKey: "key",
      }).success,
    ).toBe(false);
  });

  it("when user create password too short, then fails", async () => {
    const { usersContract } = await import("../src/index.js");
    const schema = usersContract.create["~orpc"].inputSchema as z.ZodType;
    expect(
      schema.safeParse({
        email: "user@example.com",
        password: "short",
        displayName: "User",
      }).success,
    ).toBe(false);
  });

  it("when provision input valid uuid fields, then passes", async () => {
    const { provisionContract } = await import("../src/index.js");
    const schema = provisionContract.createUser["~orpc"]
      .inputSchema as z.ZodType;
    expect(
      schema.safeParse({
        connectionId: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000002",
        email: "target@example.com",
        password: "password123",
      }).success,
    ).toBe(true);
  });
});
