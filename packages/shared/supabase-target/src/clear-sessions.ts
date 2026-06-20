/** Remove all Target Supabase browser sessions stored by SupaAdmin. */
export function clearAllTargetSessions(): void {
  if (typeof localStorage === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("supaadmin-target-")) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
