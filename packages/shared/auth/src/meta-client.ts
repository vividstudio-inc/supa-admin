import { createBrowserClient } from "@supabase/ssr";

export function createMetaBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_META_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_META_SUPABASE_ANON_KEY!,
  );
}
