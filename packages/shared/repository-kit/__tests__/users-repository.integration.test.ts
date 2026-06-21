import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUsersRepository } from "../src/users/repository";

vi.mock("server-only", () => ({}));

const created = {
  userIds: [] as string[],
  connectionIds: [] as string[],
  roleIds: [] as string[],
};

async function cleanup() {
  const { createMetaServiceClient } = await import(
    "../../auth/src/meta-server.js"
  );
  const service = createMetaServiceClient();

  for (const userId of created.userIds) {
    await service
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", userId);
    await service.from("user_roles").delete().eq("user_id", userId);
    await service.from("connection_members").delete().eq("user_id", userId);
    await service.from("profiles").delete().eq("id", userId);
    await service.auth.admin.deleteUser(userId);
  }
  for (const roleId of created.roleIds) {
    await service.from("roles").delete().eq("id", roleId);
  }
  for (const connectionId of created.connectionIds) {
    await service
      .from("connection_tables")
      .delete()
      .eq("connection_id", connectionId);
    await service.from("connections").delete().eq("id", connectionId);
  }
  created.userIds = [];
  created.connectionIds = [];
  created.roleIds = [];
}

async function createTestUser(emailPrefix: string) {
  const { createMetaServiceClient } = await import(
    "../../auth/src/meta-server.js"
  );
  const service = createMetaServiceClient();
  const suffix = randomUUID();

  const { data: userData } = await service.auth.admin.createUser({
    email: `${emailPrefix}-${suffix}@test.local`,
    password: "password12345",
    email_confirm: true,
  });
  const userId = userData!.user.id;
  created.userIds.push(userId);

  await service.from("profiles").upsert({
    id: userId,
    email: `${emailPrefix}-${suffix}@test.local`,
    role: "member",
    display_name: "Test User",
  });

  return userId;
}

describe("createUsersRepository (integration)", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("when profiles exist, then listProfiles and findProfileById return rows", async () => {
    const userId = await createTestUser("list");
    const { createDbContext } = await import("../src/db-context");
    const ctx = await createDbContext({ mode: "service" });

    await ctx.transaction(async (tx) => {
      const users = createUsersRepository(tx);
      const listed = await users.listProfiles();
      expect(listed.some((p) => p.id === userId)).toBe(true);

      const found = await users.findProfileById(userId);
      expect(found?.id).toBe(userId);
      expect(found?.display_name).toBe("Test User");
    });
  });

  it("when updateProfile called, then persists display name and role", async () => {
    const userId = await createTestUser("update");
    const { createDbContext } = await import("../src/db-context");
    const ctx = await createDbContext({ mode: "service" });

    await ctx.transaction(async (tx) => {
      const users = createUsersRepository(tx);
      const updated = await users.updateProfile(userId, {
        displayName: "Updated Name",
        role: "platform_admin",
      });
      expect(updated?.display_name).toBe("Updated Name");
      expect(updated?.role).toBe("platform_admin");
    });
  });

  it("when roles and memberships replaced, then getUserRoles and getMemberships reflect changes", async () => {
    const { createMetaServiceClient } = await import(
      "../../auth/src/meta-server.js"
    );
    const service = createMetaServiceClient();
    const userId = await createTestUser("roles");

    const roleId = randomUUID();
    created.roleIds.push(roleId);
    await service.from("roles").insert({
      id: roleId,
      name: `role-${roleId}`,
      description: "test role",
    });

    const connectionId = randomUUID();
    created.connectionIds.push(connectionId);
    await service.from("connections").insert({
      id: connectionId,
      name: "Conn",
      url: "https://example.supabase.co",
      anon_key_enc: "enc",
      service_role_enc: "enc",
    });

    const { createDbContext } = await import("../src/db-context");
    const ctx = await createDbContext({ mode: "service" });

    await ctx.transaction(async (tx) => {
      const users = createUsersRepository(tx);
      await users.replaceUserRoles(userId, [roleId]);
      await users.replaceConnectionMemberships(userId, [connectionId]);

      const roles = await users.getUserRoles(userId);
      expect(roles).toHaveLength(1);
      expect(roles[0].role_id).toBe(roleId);

      const memberships = await users.getMemberships(userId);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].connection_id).toBe(connectionId);

      await users.replaceUserRoles(userId, []);
      await users.replaceConnectionMemberships(userId, []);
      expect(await users.getUserRoles(userId)).toHaveLength(0);
      expect(await users.getMemberships(userId)).toHaveLength(0);
    });
  });

  it("when listProfilesByIds called with ids, then returns matching profiles", async () => {
    const userId = await createTestUser("byids");
    const { createDbContext } = await import("../src/db-context");
    const ctx = await createDbContext({ mode: "service" });

    await ctx.transaction(async (tx) => {
      const users = createUsersRepository(tx);
      const rows = await users.listProfilesByIds([userId, randomUUID()]);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(userId);
      expect(await users.listProfilesByIds([])).toEqual([]);
    });
  });
});
