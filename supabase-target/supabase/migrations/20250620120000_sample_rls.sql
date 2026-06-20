-- Enable RLS on sample tables with deny-by-default until SupaAdmin RLS sync

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_deny_anon ON public.posts FOR ALL TO anon USING (false);
CREATE POLICY posts_deny_authenticated ON public.posts FOR ALL TO authenticated USING (false);

CREATE POLICY comments_deny_anon ON public.comments FOR ALL TO anon USING (false);
CREATE POLICY comments_deny_authenticated ON public.comments FOR ALL TO authenticated USING (false);
