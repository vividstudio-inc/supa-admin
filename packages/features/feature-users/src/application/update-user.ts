import "server-only";
import { err, ok, type Result } from "@supa-admin/ddd";
import type { PlatformRole } from "@supa-admin/projections";
import {
  createDbContext,
  createUsersRepository,
} from "@supa-admin/repository-kit";
import { UsersFeatureError } from "../errors";

export type UpdateUserInput = {
  id: string;
  displayName?: string | null;
  role?: PlatformRole;
  roleIds?: string[];
  connectionIds?: string[];
};

export async function updateUser(
  input: UpdateUserInput,
): Promise<Result<{ success: true }, InstanceType<typeof UsersFeatureError>>> {
  try {
    const ctx = await createDbContext({ mode: "service" });
    const users = createUsersRepository(ctx.db);
    const profile = await users.findProfileById(input.id);
    if (!profile) {
      return err(new UsersFeatureError("User not found"));
    }

    if (input.displayName !== undefined || input.role !== undefined) {
      await users.updateProfile(input.id, {
        displayName: input.displayName,
        role: input.role,
      });
    }

    const effectiveRole = input.role ?? profile.role;

    if (effectiveRole === "platform_admin") {
      await users.replaceUserRoles(input.id, []);
      await users.replaceConnectionMemberships(input.id, []);
    } else {
      if (input.roleIds) {
        await users.replaceUserRoles(input.id, input.roleIds);
      }

      if (input.connectionIds) {
        await users.replaceConnectionMemberships(input.id, input.connectionIds);
      }
    }

    return ok({ success: true as const });
  } catch (error) {
    return err(
      new UsersFeatureError(
        error instanceof Error ? error.message : "Failed to update user",
      ),
    );
  }
}
