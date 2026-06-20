import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllTargetSessions } from "../src/clear-sessions";

describe("clearAllTargetSessions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes supaadmin-target-* keys from localStorage", () => {
    const store = new Map<string, string>([
      ["supaadmin-target-abc", "1"],
      ["supaadmin-target-def", "2"],
      ["other-key", "keep"],
    ]);

    vi.stubGlobal("localStorage", {
      get length() {
        return store.size;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
    });

    clearAllTargetSessions();

    expect([...store.keys()]).toEqual(["other-key"]);
  });
});
