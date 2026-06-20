import { vi } from "vitest";

/** Minimal Supabase query builder mock that supports `await client.from().select().eq()`. */
export function mockSupabaseQuery(resolved: { data: unknown; error: unknown }) {
  const promise = Promise.resolve(resolved);
  const builder: Record<string, unknown> = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue(resolved),
  };

  const thenable = Object.assign(promise, builder);
  (builder.select as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
  (builder.eq as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
  (builder.in as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
  (builder.delete as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
  (builder.update as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
  (builder.order as ReturnType<typeof vi.fn>).mockResolvedValue(resolved);

  return thenable;
}
