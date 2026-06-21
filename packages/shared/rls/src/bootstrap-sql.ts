const PERMISSION_HELPER_FUNCTION = `CREATE OR REPLACE FUNCTION public.supaadmin_has_permission(
  p_table text,
  p_action text
) RETURNS boolean AS $$
DECLARE
  perms jsonb;
BEGIN
  perms := (auth.jwt() -> 'app_metadata' -> 'permissions');
  IF perms IS NULL THEN RETURN false; END IF;
  RETURN COALESCE((perms -> p_table ->> p_action)::boolean, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.supaadmin_has_permission(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supaadmin_has_permission(text, text) TO authenticated, anon;`;

const SUPAADMIN_BOOTSTRAP_FUNCTION = `CREATE OR REPLACE FUNCTION public.supaadmin_bootstrap(tables text[])
RETURNS void AS $$
DECLARE
  t text;
  quoted text;
BEGIN
  IF tables IS NULL OR array_length(tables, 1) IS NULL THEN
    RETURN;
  END IF;
  quoted := '';
  FOREACH t IN ARRAY tables LOOP
    IF quoted <> '' THEN quoted := quoted || ', '; END IF;
    quoted := quoted || quote_ident(t);
  END LOOP;
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO authenticated, anon', quoted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.supaadmin_bootstrap(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supaadmin_bootstrap(text[]) TO service_role;`;

/** Legacy exec_sql — kept for backward-compatible manual setup migration. */
const EXEC_SQL_FUNCTION = `CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;`;

const SUPAADMIN_APPLY_RLS_SQL_FUNCTION = `CREATE OR REPLACE FUNCTION public.supaadmin_apply_rls_sql(sql text)
RETURNS void AS $$
DECLARE
  stmt text;
  normalized text;
  kw text;
  denied text[] := ARRAY[
    'COPY', 'INSERT', 'SELECT', 'UPDATE', 'DELETE', 'DO', 'EXECUTE',
    'CREATE TABLE', 'DROP TABLE', 'TRUNCATE', 'GRANT', 'REVOKE',
    'CREATE FUNCTION', 'DROP FUNCTION', 'CREATE OR REPLACE FUNCTION'
  ];
BEGIN
  IF sql IS NULL OR btrim(sql) = '' THEN
    RAISE EXCEPTION 'empty sql';
  END IF;

  FOREACH stmt IN ARRAY regexp_split_to_array(sql, ';') LOOP
    normalized := upper(regexp_replace(stmt, '--[^\\n]*', '', 'g'));
    normalized := upper(regexp_replace(normalized, '/\\*.*?\\*/', '', 'gs'));
    normalized := btrim(normalized);
    IF normalized = '' THEN
      CONTINUE;
    END IF;

    IF NOT (
      normalized LIKE 'DROP POLICY%' OR
      normalized LIKE 'CREATE POLICY%' OR
      (normalized LIKE 'ALTER TABLE%' AND normalized LIKE '%ENABLE ROW LEVEL SECURITY%')
    ) THEN
      RAISE EXCEPTION 'statement not in allowlist';
    END IF;

    FOREACH kw IN ARRAY denied LOOP
      IF kw = 'ALTER TABLE' THEN
        CONTINUE;
      END IF;
      IF normalized LIKE kw || '%' OR normalized LIKE '% ' || kw || '%' THEN
        RAISE EXCEPTION 'denied keyword: %', kw;
      END IF;
    END LOOP;

    EXECUTE stmt;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.supaadmin_apply_rls_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supaadmin_apply_rls_sql(text) TO service_role;`;

function buildGrantSql(tableNames: string[]): string {
  if (tableNames.length === 0) {
    return `-- No synced tables yet; run schema sync then re-apply bootstrap
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;`;
  }

  const quoted = tableNames.map((t) => `"${t.replace(/"/g, '""')}"`).join(", ");
  return `GRANT SELECT, INSERT, UPDATE, DELETE ON ${quoted} TO authenticated, anon;`;
}

/** Full one-time SQL for Target SQL Editor (new RPC-based bootstrap). */
export function buildManualSetupSql(tableNames: string[]): string {
  return [
    "-- SupaAdmin Target bootstrap (run once in Target SQL Editor)",
    "-- SECURITY: supaadmin_bootstrap / supaadmin_apply_rls_sql are allowlisted SECURITY DEFINER RPCs.",
    "-- Only service_role may EXECUTE them. Never expose service_role keys in client code.",
    "",
    PERMISSION_HELPER_FUNCTION,
    "",
    SUPAADMIN_BOOTSTRAP_FUNCTION,
    "",
    SUPAADMIN_APPLY_RLS_SQL_FUNCTION,
    "",
    "-- Optional: migrate from legacy exec_sql",
    "-- DROP FUNCTION IF EXISTS public.exec_sql(text);",
    "",
    buildGrantSql(tableNames),
  ].join("\n");
}

/** Migration SQL for Targets that already have exec_sql installed. */
export function buildExecSqlMigrationSql(): string {
  return [
    "-- Migrate from legacy exec_sql to allowlisted SupaAdmin RPCs",
    PERMISSION_HELPER_FUNCTION,
    "",
    SUPAADMIN_BOOTSTRAP_FUNCTION,
    "",
    SUPAADMIN_APPLY_RLS_SQL_FUNCTION,
    "",
    "DROP FUNCTION IF EXISTS public.exec_sql(text);",
  ].join("\n");
}

/** Idempotent SQL applied via exec_sql RPC (legacy fallback). */
export function buildBootstrapApplySql(tableNames: string[]): string {
  return [PERMISSION_HELPER_FUNCTION, "", buildGrantSql(tableNames)].join("\n");
}

export function isExecSqlMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("exec_sql") &&
    (lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("not found") ||
      lower.includes("pgrst202"))
  );
}

export function isSupaadminBootstrapMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("supaadmin_bootstrap") &&
    (lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("not found") ||
      lower.includes("pgrst202"))
  );
}

export function isSupaadminApplyRlsMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("supaadmin_apply_rls_sql") &&
    (lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("not found") ||
      lower.includes("pgrst202"))
  );
}

export { EXEC_SQL_FUNCTION, SUPAADMIN_APPLY_RLS_SQL_FUNCTION };
