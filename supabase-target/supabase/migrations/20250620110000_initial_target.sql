-- Target Supabase: sample tables + RLS setup for local development

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;

-- SupaAdmin RLS helpers (from templates/target-rls-setup.sql)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

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

INSERT INTO public.posts (title, body) VALUES
  ('Hello Target', 'Sample post for CRUD testing'),
  ('Second Post', 'Another sample row');
