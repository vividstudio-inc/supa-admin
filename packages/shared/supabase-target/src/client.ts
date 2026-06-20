import { createBrowserClient } from "@supabase/ssr";

export function createTargetBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: `supaadmin-target-${btoa(url).slice(0, 16)}`,
    },
  });
}
