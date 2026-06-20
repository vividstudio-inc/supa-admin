import "server-only";
import type { ColumnMeta } from "@supa-admin/projections";
import { validateTargetUrl } from "@supa-admin/utils";

export async function fetchSchemaViaRest(
  url: string,
  serviceRoleEnc: string,
): Promise<{
  tables: { table_name: string; columns: ColumnMeta[] }[];
  error?: string;
}> {
  const urlCheck = validateTargetUrl(url);
  if (!urlCheck.ok) {
    return { tables: [], error: urlCheck.reason };
  }

  const { decrypt } = await import("@supa-admin/crypto");
  const serviceRoleKey = decrypt(serviceRoleEnc);
  const baseUrl = url.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    return {
      tables: [],
      error:
        "Schema introspection failed. Verify Service Role key and GRANT on public tables.",
    };
  }

  const spec = await response.json();
  const definitions = spec.definitions ?? {};
  const tables: { table_name: string; columns: ColumnMeta[] }[] = [];

  for (const [tableName, def] of Object.entries(definitions)) {
    if (tableName.startsWith("_")) continue;
    const props =
      (
        def as {
          properties?: Record<string, { type?: string; format?: string }>;
        }
      ).properties ?? {};
    const required = (def as { required?: string[] }).required ?? [];

    tables.push({
      table_name: tableName,
      columns: Object.entries(props).map(([name, prop]) => ({
        name,
        data_type: prop.format ?? prop.type ?? "text",
        is_nullable: !required.includes(name),
        column_default: null,
        is_primary_key: name === "id",
        is_identity: false,
      })),
    });
  }

  if (tables.length === 0) {
    return {
      tables: [],
      error: "No public tables found. Check GRANT on the target database.",
    };
  }

  return { tables };
}

export async function syncConnectionSchema(
  connectionId: string,
  url: string,
  serviceRoleEnc: string,
) {
  const { createMetaServerClient } = await import("@supa-admin/auth/server");
  const supabase = await createMetaServerClient();

  const result = await fetchSchemaViaRest(url, serviceRoleEnc);

  if (result.error && result.tables.length === 0) {
    return { success: false, error: result.error };
  }

  await supabase
    .from("connection_tables")
    .delete()
    .eq("connection_id", connectionId);

  if (result.tables.length > 0) {
    const { error: insertError } = await supabase
      .from("connection_tables")
      .insert(
        result.tables.map((t) => ({
          connection_id: connectionId,
          table_name: t.table_name,
          columns: t.columns,
        })),
      );
    if (insertError) return { success: false, error: insertError.message };
  }

  await supabase
    .from("connections")
    .update({ schema_cached_at: new Date().toISOString() })
    .eq("id", connectionId);

  return { success: true, tableCount: result.tables.length };
}
