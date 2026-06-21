import { randomUUID } from "node:crypto";
import { schema, sql } from "@supa-admin/db";
import { withRollbackTx } from "@supa-admin/vitest-config/setup";
import { describe, expect, it, vi } from "vitest";
import {
  connectionExists,
  createConnectionRepository,
  findConnectionAnonKeyEnc,
  findConnectionCredentials,
  isConnectionMember,
  listConnectionTableNames,
} from "../src/connections/repository";

vi.mock("server-only", () => ({}));

describe("createConnectionRepository (integration)", () => {
  it("when create and findById, then round-trips connection fields", async () => {
    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const created = await repo.create({
        name: `conn-${randomUUID()}`,
        url: "https://example.supabase.co",
        anonKeyEnc: "anon-enc",
        serviceRoleEnc: "service-enc",
        bootstrapStatus: "pending",
      });

      const found = await repo.findById(created.id);
      expect(found?.name).toBe(created.name);
      expect(found?.url).toBe("https://example.supabase.co");
      expect(found?.bootstrap_status).toBe("pending");
    });
  });

  it("when list and listByIds, then returns created connections", async () => {
    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const a = await repo.create({
        name: `a-${randomUUID()}`,
        url: "https://a.supabase.co",
        anonKeyEnc: "a",
        serviceRoleEnc: "a",
      });
      const b = await repo.create({
        name: `b-${randomUUID()}`,
        url: "https://b.supabase.co",
        anonKeyEnc: "b",
        serviceRoleEnc: "b",
      });

      const all = await repo.list();
      expect(all.some((c) => c.id === a.id)).toBe(true);
      expect(all.some((c) => c.id === b.id)).toBe(true);

      const subset = await repo.listByIds([a.id]);
      expect(subset).toHaveLength(1);
      expect(subset[0].id).toBe(a.id);
      expect(await repo.listByIds([])).toEqual([]);
    });
  });

  it("when tables replaced and bootstrap updated, then listTables and status reflect state", async () => {
    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const conn = await repo.create({
        name: `tables-${randomUUID()}`,
        url: "https://tables.supabase.co",
        anonKeyEnc: "anon",
        serviceRoleEnc: "service",
      });

      await repo.replaceTables(conn.id, [
        { tableName: "posts", columns: [{ name: "id", type: "uuid" }] },
      ]);
      let tables = await repo.listTables(conn.id);
      expect(tables).toHaveLength(1);
      expect(tables[0].table_name).toBe("posts");

      await repo.insertTables(conn.id, [
        { tableName: "comments", columns: [] },
      ]);
      tables = await repo.listTables(conn.id);
      expect(tables).toHaveLength(2);

      const verifiedAt = new Date("2024-06-01T00:00:00.000Z");
      await repo.updateBootstrapStatus(conn.id, "verified", verifiedAt);
      await repo.updateSchemaCachedAt(conn.id, verifiedAt);

      const updated = await repo.findById(conn.id);
      expect(updated?.bootstrap_status).toBe("verified");
      expect(updated?.schema_cached_at).toBeTruthy();

      await repo.replaceTables(conn.id, []);
      expect(await repo.listTables(conn.id)).toHaveLength(0);
    });
  });

  it("when webhook secret rotated, then setWebhookSecretEnc and getWebhookSecretEnc match", async () => {
    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const conn = await repo.create({
        name: `webhook-${randomUUID()}`,
        url: "https://webhook.supabase.co",
        anonKeyEnc: "anon",
        serviceRoleEnc: "service",
      });

      const rotated = await repo.setWebhookSecretEnc(conn.id, "new-secret-enc");
      expect(rotated?.webhook_secret_enc).toBe("new-secret-enc");
      expect(await repo.getWebhookSecretEnc(conn.id)).toBe("new-secret-enc");
    });
  });

  it("when delete called, then connection is removed", async () => {
    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const conn = await repo.create({
        name: `del-${randomUUID()}`,
        url: "https://del.supabase.co",
        anonKeyEnc: "anon",
        serviceRoleEnc: "service",
      });

      await repo.delete(conn.id);
      expect(await repo.findById(conn.id)).toBeNull();
    });
  });

  it("when helper queries used, then credentials membership and table names resolve", async () => {
    const userId = randomUUID();

    await withRollbackTx(async (tx) => {
      const repo = createConnectionRepository(tx);
      const conn = await repo.create({
        name: `helpers-${randomUUID()}`,
        url: "https://helpers.supabase.co",
        anonKeyEnc: "anon-key",
        serviceRoleEnc: "service-key",
      });

      await repo.replaceTables(conn.id, [{ tableName: "items", columns: [] }]);

      expect(await connectionExists(tx, conn.id)).toBe(true);
      expect(await connectionExists(tx, randomUUID())).toBe(false);

      const creds = await findConnectionCredentials(tx, conn.id);
      expect(creds?.url).toBe("https://helpers.supabase.co");
      expect(creds?.serviceRoleEnc).toBe("service-key");

      expect(await findConnectionAnonKeyEnc(tx, conn.id)).toBe("anon-key");
      expect(await listConnectionTableNames(tx, conn.id)).toEqual(["items"]);

      await tx.execute(
        sql.raw(
          `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
           VALUES (
             '${userId}'::uuid,
             '00000000-0000-0000-0000-000000000000'::uuid,
             'authenticated',
             'authenticated',
             'member@test.local',
             crypt('password', gen_salt('bf')),
             now(),
             now(),
             now()
           )`,
        ),
      );
      await tx.insert(schema.connectionMembers).values({
        userId,
        connectionId: conn.id,
      });

      expect(await isConnectionMember(tx, conn.id, userId)).toBe(true);
      expect(await isConnectionMember(tx, conn.id, randomUUID())).toBe(false);
    });
  });
});
