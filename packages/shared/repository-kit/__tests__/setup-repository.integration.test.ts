import { eq, schema } from "@supa-admin/db";
import { withRollbackTx } from "@supa-admin/vitest-config/setup";
import { describe, expect, it, vi } from "vitest";
import { createSetupRepository } from "../src/setup/repository";

vi.mock("server-only", () => ({}));

const SETUP_KEY = "setup_complete";

describe("createSetupRepository (integration)", () => {
  it("when setup_complete is false, then tryLockSetup succeeds and completeSetup marks true", async () => {
    await withRollbackTx(async (tx) => {
      const setup = createSetupRepository(tx);
      await tx
        .update(schema.appSettings)
        .set({ value: false, updatedAt: new Date() })
        .where(eq(schema.appSettings.key, SETUP_KEY));

      expect(await setup.isSetupComplete()).toBe(false);
      expect(await setup.tryLockSetup()).toBe(true);
      expect(await setup.isSetupComplete()).toBe(false);

      await setup.completeSetup();
      expect(await setup.isSetupComplete()).toBe(true);
    });
  });

  it("when setup already complete, then tryLockSetup returns false", async () => {
    await withRollbackTx(async (tx) => {
      const setup = createSetupRepository(tx);
      await tx
        .update(schema.appSettings)
        .set({ value: true, updatedAt: new Date() })
        .where(eq(schema.appSettings.key, SETUP_KEY));

      expect(await setup.tryLockSetup()).toBe(false);
    });
  });

  it("when unlockSetup called, then setup_complete returns to false", async () => {
    await withRollbackTx(async (tx) => {
      const setup = createSetupRepository(tx);
      await tx
        .update(schema.appSettings)
        .set({ value: true, updatedAt: new Date() })
        .where(eq(schema.appSettings.key, SETUP_KEY));

      await setup.unlockSetup();
      expect(await setup.isSetupComplete()).toBe(false);
    });
  });

  it("when promoteProfileToAdmin called, then profile role is platform_admin", async () => {
    const { createMetaServiceClient } = await import(
      "../../auth/src/meta-server.js"
    );
    const service = createMetaServiceClient();
    const suffix = (await import("node:crypto")).randomUUID();
    const { data: userData } = await service.auth.admin.createUser({
      email: `setup-admin-${suffix}@test.local`,
      password: "password12345",
      email_confirm: true,
    });
    const userId = userData!.user.id;

    try {
      await service.from("profiles").upsert({
        id: userId,
        email: `setup-admin-${suffix}@test.local`,
        role: "member",
        display_name: "Before",
      });

      const { createDbContext } = await import("../src/db-context");
      const ctx = await createDbContext({ mode: "service" });
      await ctx.transaction(async (tx) => {
        const setup = createSetupRepository(tx);
        await setup.promoteProfileToAdmin(userId, "Admin User");

        const { createUsersRepository } = await import(
          "../src/users/repository"
        );
        const profile = await createUsersRepository(tx).findProfileById(userId);
        expect(profile?.role).toBe("platform_admin");
        expect(profile?.display_name).toBe("Admin User");
      });
    } finally {
      await service.from("profiles").delete().eq("id", userId);
      await service.auth.admin.deleteUser(userId);
    }
  });
});
