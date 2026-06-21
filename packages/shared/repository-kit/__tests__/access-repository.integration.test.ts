import { randomUUID } from "node:crypto";
import { schema, sql } from "@supa-admin/db";
import { withRollbackTx } from "@supa-admin/vitest-config/setup";
import { describe, expect, it, vi } from "vitest";
import { createAccessRepository } from "../src/access/repository";

vi.mock("server-only", () => ({}));

describe("createAccessRepository (integration)", () => {
  it("when createRole called inside withRollbackTx, then role is readable in same tx", async () => {
    const roleName = `integration-${randomUUID()}`;

    await withRollbackTx(async (tx) => {
      const access = createAccessRepository(tx);
      const created = await access.createRole(roleName, "integration test");
      const roles = await access.listRoles();
      expect(roles.some((role) => role.id === created.id)).toBe(true);
      expect(roles.find((role) => role.id === created.id)?.name).toBe(roleName);
    });
  });

  it("when role permissions replaced, then getRolePermissions returns rows", async () => {
    await withRollbackTx(async (tx) => {
      const access = createAccessRepository(tx);
      const role = await access.createRole(`perm-${randomUUID()}`, "perms");
      const connectionId = randomUUID();

      await tx.insert(schema.connections).values({
        id: connectionId,
        name: "Perm Conn",
        url: "https://perm.supabase.co",
        anonKeyEnc: "a",
        serviceRoleEnc: "s",
      });

      await access.replaceRolePermissions(role.id, connectionId, [
        {
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ]);

      const perms = await access.getRolePermissions(role.id, connectionId);
      expect(perms).toHaveLength(1);
      expect(perms[0].table_name).toBe("posts");
      expect(perms[0].can_read).toBe(true);

      await access.replaceRolePermissions(role.id, connectionId, []);
      expect(
        await access.getRolePermissions(role.id, connectionId),
      ).toHaveLength(0);
    });
  });

  it("when user overrides replaced, then override rows are readable", async () => {
    const userId = randomUUID();
    const connectionId = randomUUID();

    await withRollbackTx(async (tx) => {
      await tx.execute(
        sql.raw(
          `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
           VALUES (
             '${userId}'::uuid,
             '00000000-0000-0000-0000-000000000000'::uuid,
             'authenticated',
             'authenticated',
             'override@test.local',
             crypt('password', gen_salt('bf')),
             now(),
             now(),
             now()
           )`,
        ),
      );
      await tx.insert(schema.connections).values({
        id: connectionId,
        name: "Override Conn",
        url: "https://override.supabase.co",
        anonKeyEnc: "a",
        serviceRoleEnc: "s",
      });

      const access = createAccessRepository(tx);
      await access.replaceUserPermissionOverrides(userId, connectionId, [
        {
          table_name: "posts",
          can_read: true,
          can_create: true,
          can_update: null,
          can_delete: false,
        },
      ]);

      const overrides = await access.getUserPermissionOverrides(
        userId,
        connectionId,
      );
      expect(overrides).toHaveLength(1);
      expect(overrides[0].table_name).toBe("posts");

      const rows = await access.getUserPermissionOverrideRows(
        userId,
        connectionId,
      );
      expect(rows[0].can_create).toBe(true);

      const role = await access.createRole(`override-role-${randomUUID()}`);
      await tx.insert(schema.userRoles).values({ userId, roleId: role.id });
      await tx.insert(schema.connectionMembers).values({
        userId,
        connectionId,
      });

      expect(await access.getUserRoleIds(userId)).toContain(role.id);
      expect(await access.getMemberConnectionIds(userId)).toContain(
        connectionId,
      );
      expect(await access.listAllConnectionIds()).toContain(connectionId);

      await access.replaceRolePermissions(role.id, connectionId, [
        {
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ]);
      const rolePerms = await access.getRolePermissionsForUser(
        userId,
        connectionId,
      );
      expect(rolePerms).toHaveLength(1);
      expect(rolePerms[0].can_read).toBe(true);
    });
  });
});
