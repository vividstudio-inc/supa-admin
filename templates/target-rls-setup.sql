-- Optional one-time setup for target Supabase projects
-- Enables SupaAdmin RLS sync via exec_sql RPC (fallback: copy generated SQL manually)
--
-- SECURITY: exec_sql runs arbitrary SQL as SECURITY DEFINER. Only service_role may
-- EXECUTE it. Never expose service_role keys in client code or logs.
--
-- Sample tables (posts, comments) ship with RLS enabled and deny-by-default policies
-- until SupaAdmin RLS sync applies per-table permissions. Direct anon/authenticated
-- CRUD is blocked until sync completes.

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Restrict to service_role only
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Helper referenced by SupaAdmin-generated RLS policies
CREATE OR REPLACE FUNCTION public.supaadmin_has_permission(
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
GRANT EXECUTE ON FUNCTION public.supaadmin_has_permission(text, text) TO authenticated, anon;

-- Example GRANT for public tables (adjust table names)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;
