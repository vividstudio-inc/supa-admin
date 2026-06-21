import "server-only";
import {
  createMetaServerClient,
  createMetaServiceClient,
} from "@supa-admin/auth/server";
import type { PlatformRole } from "@supa-admin/projections";
import { createTargetAdminClient } from "@supa-admin/supabase-target/admin";
import { buildTargetJwtPermissions } from "./jwt-permissions";

export async function findTargetUserByEmail(
  targetAdmin: Pick<ReturnType<typeof createTargetAdminClient>, "auth">,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await targetAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);

    const found = data.users.find(
      (u) => u.email?.trim().toLowerCase() === normalized,
    );
    if (found?.email) {
      return { id: found.id, email: found.email };
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export type SyncTargetPermissionsInput = {
  metaUserId: string;
  connectionId: string;
  platformRole: PlatformRole;
  targetEmail: string;
  url: string;
  serviceRoleEnc: string;
};

export type SyncTargetPermissionsResult =
  | { success: true; targetUserId: string }
  | {
      success: false;
      code: "target_user_not_found" | "email_mismatch";
      message: string;
    };

export async function syncTargetUserPermissions(
  input: SyncTargetPermissionsInput,
): Promise<SyncTargetPermissionsResult> {
  const supabase = await createMetaServerClient();
  const targetAdmin = createTargetAdminClient(input.url, input.serviceRoleEnc);
  const normalizedEmail = input.targetEmail.trim().toLowerCase();

  if (input.platformRole === "member") {
    const { data: mapping } = await supabase
      .from("target_user_mappings")
      .select("target_email")
      .eq("user_id", input.metaUserId)
      .eq("connection_id", input.connectionId)
      .maybeSingle();

    if (!mapping) {
      return {
        success: false,
        code: "target_user_not_found",
        message:
          "Target user not provisioned. Ask a platform admin to provision your account.",
      };
    }

    if (mapping.target_email.trim().toLowerCase() !== normalizedEmail) {
      return {
        success: false,
        code: "email_mismatch",
        message: "Email does not match the provisioned Target account.",
      };
    }
  }

  const targetUser = await findTargetUserByEmail(targetAdmin, normalizedEmail);
  if (!targetUser) {
    return {
      success: false,
      code: "target_user_not_found",
      message:
        input.platformRole === "member"
          ? "Target user not found. Ask a platform admin to provision your account."
          : "Target user not found for this email.",
    };
  }

  const appMeta = await buildTargetJwtPermissions(
    input.metaUserId,
    input.connectionId,
    input.platformRole,
  );

  const { error: updateError } = await targetAdmin.auth.admin.updateUserById(
    targetUser.id,
    { app_metadata: appMeta },
  );
  if (updateError) {
    throw new Error(updateError.message);
  }

  const service = createMetaServiceClient();
  await service.from("target_user_mappings").upsert(
    {
      user_id: input.metaUserId,
      connection_id: input.connectionId,
      target_user_id: targetUser.id,
      target_email: targetUser.email,
    },
    { onConflict: "user_id,connection_id" },
  );

  return { success: true, targetUserId: targetUser.id };
}
