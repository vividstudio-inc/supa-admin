import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const created = {
  userIds: [] as string[],
  connectionIds: [] as string[],
  roleIds: [] as string[],
};

async function cleanup() {
  const { createMetaServiceClient } = await import("../src/meta-server.js");
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
    await service.from("role_permissions").delete().eq("role_id", roleId);
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

describe("resolveUserPermissions", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("when platform_admin, then full access on connection tables", async () => {
    const { createMetaServiceClient } = await import("../src/meta-server.js");
    const { resolveUserPermissions } = await import("../src/permissions.js");
    const service = createMetaServiceClient();
    const adminId = randomUUID();

    const { data: userData } = await service.auth.admin.createUser({
      email: `admin-${adminId}@test.local`,
      password: "password12345",
      email_confirm: true,
    });
    const userId = userData!.user.id;
    created.userIds.push(userId);

    await service.from("profiles").upsert({
      id: userId,
      email: `admin-${adminId}@test.local`,
      role: "platform_admin",
    });

    const connectionId = randomUUID();
    created.connectionIds.push(connectionId);
    await service.from("connections").insert({
      id: connectionId,
      name: "Test",
      url: "https://example.supabase.co",
      anon_key_enc: "enc",
      service_role_enc: "enc",
    });
    await service.from("connection_tables").insert({
      connection_id: connectionId,
      table_name: "posts",
      columns: [],
    });

    const perms = await resolveUserPermissions(
      userId,
      connectionId,
      "platform_admin",
    );
    expect(perms).toEqual([
      {
        connection_id: connectionId,
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
    ]);
  });

  it("when member with role OR merge and override, then resolves correctly", async () => {
    const { createMetaServiceClient } = await import("../src/meta-server.js");
    const { resolveUserPermissions, canAccessTable } = await import(
      "../src/permissions.js"
    );
    const service = createMetaServiceClient();
    const memberId = randomUUID();

    const { data: userData } = await service.auth.admin.createUser({
      email: `member-${memberId}@test.local`,
      password: "password12345",
      email_confirm: true,
    });
    const userId = userData!.user.id;
    created.userIds.push(userId);

    await service.from("profiles").upsert({
      id: userId,
      email: `member-${memberId}@test.local`,
      role: "member",
    });

    const connectionId = randomUUID();
    created.connectionIds.push(connectionId);
    await service.from("connections").insert({
      id: connectionId,
      name: "Test",
      url: "https://example.supabase.co",
      anon_key_enc: "enc",
      service_role_enc: "enc",
    });

    const roleId = randomUUID();
    created.roleIds.push(roleId);
    await service.from("roles").insert({ id: roleId, name: `role-${roleId}` });
    await service
      .from("user_roles")
      .insert({ user_id: userId, role_id: roleId });
    await service.from("role_permissions").insert({
      role_id: roleId,
      connection_id: connectionId,
      table_name: "posts",
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
    await service.from("user_permission_overrides").insert({
      user_id: userId,
      connection_id: connectionId,
      table_name: "posts",
      can_read: null,
      can_create: true,
      can_update: null,
      can_delete: null,
    });

    const perms = await resolveUserPermissions(userId, connectionId, "member");
    expect(perms).toEqual([
      {
        connection_id: connectionId,
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: false,
        can_delete: false,
      },
    ]);

    expect(
      await canAccessTable(
        userId,
        connectionId,
        "posts",
        "can_create",
        "member",
      ),
    ).toBe(true);
    expect(
      await canAccessTable(
        userId,
        connectionId,
        "posts",
        "can_delete",
        "member",
      ),
    ).toBe(false);
  });
});

describe("getUserConnectionIds", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("when platform_admin, then returns all connection ids", async () => {
    const { createMetaServiceClient } = await import("../src/meta-server.js");
    const { getUserConnectionIds } = await import("../src/permissions.js");
    const service = createMetaServiceClient();
    const adminId = randomUUID();

    const { data: userData } = await service.auth.admin.createUser({
      email: `admin2-${adminId}@test.local`,
      password: "password12345",
      email_confirm: true,
    });
    const userId = userData!.user.id;
    created.userIds.push(userId);

    const connectionId = randomUUID();
    created.connectionIds.push(connectionId);
    await service.from("connections").insert({
      id: connectionId,
      name: "Test",
      url: "https://example.supabase.co",
      anon_key_enc: "enc",
      service_role_enc: "enc",
    });

    const ids = await getUserConnectionIds(userId, "platform_admin");
    expect(ids).toContain(connectionId);
  });
});
