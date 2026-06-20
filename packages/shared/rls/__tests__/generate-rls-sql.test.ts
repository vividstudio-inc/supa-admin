import { describe, expect, it } from "vitest";
import { generateRlsSql } from "../src/generate-sql.js";

const basePerm = {
  id: "1",
  role_id: "r1",
  connection_id: "c1",
  table_name: "posts",
  can_read: true,
  can_create: false,
  can_update: false,
  can_delete: false,
};

describe("generateRlsSql", () => {
  it("when read permission, then includes helper and select policy", () => {
    const sql = generateRlsSql([basePerm], [{ id: "r1", name: "editor" }]);
    expect(sql).toContain("supaadmin_has_permission");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("posts");
    expect(sql).toContain("_select");
  });

  it("when all CRUD permissions, then includes all policy types", () => {
    const sql = generateRlsSql(
      [
        {
          ...basePerm,
          can_create: true,
          can_update: true,
          can_delete: true,
        },
      ],
      [{ id: "r1", name: "editor" }],
    );
    expect(sql).toContain("_insert");
    expect(sql).toContain("_update");
    expect(sql).toContain("_delete");
  });

  it("when role name has special chars, then sanitizes policy name", () => {
    const sql = generateRlsSql(
      [basePerm],
      [{ id: "r1", name: "editor-role!" }],
    );
    expect(sql).toContain("supaadmin_editor_role_");
    expect(sql).not.toContain("editor-role!");
  });

  it("when table name has quotes, then escapes in SQL", () => {
    const sql = generateRlsSql(
      [{ ...basePerm, table_name: 'weird"name' }],
      [{ id: "r1", name: "editor" }],
    );
    expect(sql).toContain('"weird"name"');
  });

  it("when multiple roles on same table, then generates separate policies", () => {
    const sql = generateRlsSql(
      [
        { ...basePerm, role_id: "r1" },
        { ...basePerm, id: "2", role_id: "r2", can_create: true },
      ],
      [
        { id: "r1", name: "reader" },
        { id: "r2", name: "writer" },
      ],
    );
    expect(sql).toContain("supaadmin_reader_");
    expect(sql).toContain("supaadmin_writer_");
    expect(sql).toContain("_insert");
  });

  it("when no permissions, then still includes helper function", () => {
    const sql = generateRlsSql([], []);
    expect(sql).toContain("supaadmin_has_permission");
    expect(sql).not.toContain("ENABLE ROW LEVEL SECURITY");
  });
});
