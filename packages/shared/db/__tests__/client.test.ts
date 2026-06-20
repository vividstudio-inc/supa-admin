import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { createClient, getRawClient, registerRawClient } from "../src/index.js";

describe("createClient", () => {
  it("when called with connection string, then returns drizzle client", () => {
    const db = createClient(
      process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      { max: 1 },
    );
    expect(db).toBeDefined();
    expect(typeof db.select).toBe("function");
  });

  it("when getRawClient called, then returns pool", () => {
    const db = createClient(
      process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      { max: 1 },
    );
    const pool = getRawClient(db);
    expect(pool).toBeDefined();
    expect(typeof (pool as Pool).end).toBe("function");
  });

  it("when raw client missing, then getRawClient throws", () => {
    const fakeDb = {} as ReturnType<typeof createClient>;
    expect(() => getRawClient(fakeDb)).toThrow("Raw client not found");
  });

  it("when registerRawClient called, then getRawClient returns it", () => {
    const fakeDb = {} as ReturnType<typeof createClient>;
    const fakePool = { end: async () => {} } as Pool;
    registerRawClient(fakeDb, fakePool);
    expect(getRawClient(fakeDb)).toBe(fakePool);
  });
});
