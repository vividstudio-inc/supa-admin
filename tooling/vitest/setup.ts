import { createClient, type Database, type Transaction } from "@supa-admin/db";
import { afterAll } from "vitest";

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEFAULT_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

process.env.TEST_DATABASE_URL ??=
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
process.env.NEXT_PUBLIC_META_SUPABASE_URL ??= DEFAULT_SUPABASE_URL;
process.env.NEXT_PUBLIC_META_SUPABASE_ANON_KEY ??= DEFAULT_ANON_KEY;
process.env.META_SUPABASE_SERVICE_ROLE_KEY ??= DEFAULT_SERVICE_ROLE_KEY;
process.env.ENCRYPTION_KEY ??= DEFAULT_ENCRYPTION_KEY;
process.env.SETUP_SECRET ??= DEFAULT_ENCRYPTION_KEY;
process.env.SKIP_ENV_VALIDATION ??= "true";

import ws from "ws";

globalThis.WebSocket = ws as unknown as typeof globalThis.WebSocket;

/**
 * Shared Drizzle test client. Import from `@supa-admin/vitest-config/setup` in test files.
 * Use `withRollbackTx` to isolate each test via transaction rollback.
 */
const databaseUrl = process.env.TEST_DATABASE_URL;

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
