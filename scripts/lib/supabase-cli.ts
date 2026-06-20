/** Resolve Supabase CLI — prefers global `supabase`, falls back to `npx supabase`. */
export function supabaseCmd(args: string): string {
  return `npx supabase ${args}`;
}
