import { describe, expect, it } from "vitest";
import { generateRlsSql } from "../src/generate-sql";

describe("generateRlsSql", () => {
  it("includes helper function and policies", () => {
    const sql = generateRlsSql(
      [
        {
          id: "1",
          role_id: "r1",
          connection_id: "c1",
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ],
      [{ id: "r1", name: "editor" }],
    );
    expect(sql).toContain("supaadmin_has_permission");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("posts");
  });
});
