/** Strip PostgREST filter metacharacters from user search input. */
export function sanitizePostgrestFilter(value: string): string {
  return value.replace(/[,()%.\\]/g, "");
}
