import { describe, expect, it } from "vitest";
import {
  buildForeignKeyDetailHref,
  canReadForeignTable,
  canUseForeignKey,
  formatRowLabel,
  getDisplayLabelColumn,
  needsForeignKeyResync,
  parseTableEqFilter,
} from "@/lib/foreign-key/utils";

describe("foreign-key utils", () => {
  const permissions = [
    {
      connection_id: "conn-1",
      table_name: "posts",
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    },
    {
      connection_id: "conn-1",
      table_name: "comments",
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
    },
  ];

  it("when referenced table readable, then canUseForeignKey is true", () => {
    expect(
      canUseForeignKey({ table: "posts", column: "id" }, permissions),
    ).toBe(true);
  });

  it("when referenced table not readable, then canUseForeignKey is false", () => {
    expect(canReadForeignTable(permissions, "missing")).toBe(false);
  });

  it("when row has title, then formatRowLabel prefers title", () => {
    const columns = [
      {
        name: "id",
        data_type: "uuid",
        is_nullable: false,
        column_default: null,
        is_primary_key: true,
        is_identity: false,
      },
      {
        name: "title",
        data_type: "text",
        is_nullable: false,
        column_default: null,
        is_primary_key: false,
        is_identity: false,
      },
    ];

    expect(formatRowLabel({ id: "abc", title: "Hello" }, columns)).toBe(
      "Hello",
    );
    expect(getDisplayLabelColumn(columns)?.name).toBe("title");
  });

  it("when uuid suffix column lacks foreign_key, then needsForeignKeyResync", () => {
    expect(
      needsForeignKeyResync([
        {
          table_name: "comments",
          columns: [
            {
              name: "post_id",
              data_type: "uuid",
              is_nullable: false,
              column_default: null,
              is_primary_key: false,
              is_identity: false,
            },
          ],
        },
      ]),
    ).toBe(true);
  });

  it("when eq search param present, then parseTableEqFilter returns filter", () => {
    expect(parseTableEqFilter({ eq_id: "abc" })).toEqual({
      column: "id",
      value: "abc",
    });
  });

  it("when building detail href, then includes encoded filter", () => {
    expect(
      buildForeignKeyDetailHref(
        "conn-1",
        { table: "posts", column: "id" },
        "x/y",
      ),
    ).toBe("/conn-1/posts?eq_id=x%2Fy");
  });
});
