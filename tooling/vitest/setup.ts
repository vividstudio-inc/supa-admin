import { createClient, type Database, type Transaction } from "@supa-admin/db";
import { afterAll } from "vitest";

/**
 * Shared Drizzle test client. Import from `@supa-admin/vitest-config/setup` in test files.
 * Use `withRollbackTx` to isolate each test via transaction rollback.
 */
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://test:test@localhost:5435/test";

export const testDb: Database = createClient(databaseUrl, {
  max: 4,
  idleTimeout: 5,
});

afterAll(async () => {
  const client = (testDb as unknown as { $client?: { end(): Promise<void> } })
    .$client;
  if (client) {
    await client.end();
  }
});

class TestRollback extends Error {}

/**
 * Runs `fn` inside a transaction that always rolls back after the test body.
 */
export async function withRollbackTx<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let captured: unknown;
  try {
    await testDb.transaction(async (tx) => {
      try {
        result = await fn(tx);
      } catch (error) {
        captured = error;
      }
      throw new TestRollback();
    });
  } catch (error) {
    if (!(error instanceof TestRollback)) {
      throw error;
    }
  }
  if (captured) {
    throw captured;
  }
  return result as T;
}
