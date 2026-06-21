import "server-only";
import type { ColumnMeta } from "@supa-admin/projections";
import { validateTargetUrl } from "@supa-admin/utils";
import { parseForeignKeyFromOpenApiDescription } from "./parse-foreign-key";

export { parseForeignKeyFromOpenApiDescription } from "./parse-foreign-key";

function allowLocalTargetUrlsFromEnv() {
  const flag = process.env.ALLOW_LOCAL_TARGET_URLS;
  return {
    allowLocalTargetUrls: flag === "true" || flag === "1",
  };
}

export async function fetchSchemaViaRest(
  url: string,
  serviceRoleEnc: string,
): Promise<{
  tables: { table_name: string; columns: ColumnMeta[] }[];
  error?: string;
}> {
  const urlCheck = validateTargetUrl(url, allowLocalTargetUrlsFromEnv());
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
          properties?: Record<
            string,
            { type?: string; format?: string; description?: string }
          >;
        }
      ).properties ?? {};
    const required = (def as { required?: string[] }).required ?? [];

    tables.push({
      table_name: tableName,
      columns: Object.entries(props).map(([name, prop]) => {
        const foreignKey = parseForeignKeyFromOpenApiDescription(
          prop.description,
        );
        return {
          name,
          data_type: prop.format ?? prop.type ?? "text",
          is_nullable: !required.includes(name),
          column_default: null,
          is_primary_key: name === "id",
          is_identity: false,
          ...(foreignKey ? { foreign_key: foreignKey } : {}),
        };
      }),
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
