-- Security hardening: RLS, connections VIEW, handle_new_user, anon setup_complete

-- Always assign member role on signup (admin promotion via service role only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- app_settings: restrict authenticated reads; allow anon setup_complete for middleware
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR key = 'setup_complete');

CREATE POLICY app_settings_anon_setup ON public.app_settings
  FOR SELECT TO anon USING (key = 'setup_complete');

-- connections: base table SELECT admin-only (protects *_enc columns)
DROP POLICY IF EXISTS connections_select ON public.connections;
CREATE POLICY connections_select ON public.connections FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Member-safe view (excludes encrypted keys; row filter replaces view RLS — unsupported on views)
CREATE OR REPLACE VIEW public.connections_member
WITH (security_invoker = false) AS
  SELECT
    c.id,
    c.name,
    c.url,
    c.schema_cached_at,
    c.created_by,
    c.created_at,
    c.updated_at
  FROM public.connections c
  WHERE public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.connection_members cm
      WHERE cm.connection_id = c.id AND cm.user_id = auth.uid()
    );

GRANT SELECT ON public.connections_member TO authenticated;

-- roles / role_permissions: admin-only SELECT
DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Note: broad GRANTs on public schema are intentional for PostgREST; RLS enforces access.
