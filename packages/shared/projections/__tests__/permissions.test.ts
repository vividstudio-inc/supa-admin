import { describe, expect, it } from "vitest";
import {
  aggregateRolePermissions,
  applyPermissionOverrides,
  buildFullAccessPermissions,
  mergePermissions,
  resolvePermissionsFromRows,
  resolvePermissionsRecord,
} from "../src/index.js";

describe("mergePermissions", () => {
  it("when no override, then uses role permissions", () => {
    expect(
      mergePermissions(
        {
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
        null,
      ),
    ).toEqual({
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });

  it("when override set, then override takes precedence", () => {
    expect(
      mergePermissions(
        {
          can_read: true,
          can_create: true,
          can_update: false,
          can_delete: false,
        },
        { can_read: false },
      ),
    ).toEqual({
      can_read: false,
      can_create: true,
      can_update: false,
      can_delete: false,
    });
  });

  it("when role is null, then defaults to all false", () => {
    expect(mergePermissions(null, null)).toEqual({
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });

  it("when partial override, then only overridden fields change", () => {
    expect(
      mergePermissions(
        {
          can_read: true,
          can_create: true,
          can_update: true,
          can_delete: false,
        },
        { can_delete: true },
      ),
    ).toEqual({
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
    });
  });
});

describe("aggregateRolePermissions", () => {
  const cases = [
    {
      name: "single role single table",
      input: [
        {
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ],
      expected: {
        posts: {
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      },
    },
    {
      name: "two roles OR merge read",
      input: [
        {
          table_name: "posts",
          can_read: false,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
        {
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ],
      expected: {
        posts: {
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      },
    },
    {
      name: "two roles OR merge all actions",
      input: [
        {
          table_name: "t",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
        {
          table_name: "t",
          can_read: false,
          can_create: true,
          can_update: true,
          can_delete: true,
        },
      ],
      expected: {
        t: {
          can_read: true,
          can_create: true,
          can_update: true,
          can_delete: true,
        },
      },
    },
    {
      name: "multiple tables",
      input: [
        {
          table_name: "a",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
        {
          table_name: "b",
          can_read: false,
          can_create: true,
          can_update: false,
          can_delete: false,
        },
      ],
      expected: {
        a: {
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
        b: {
          can_read: false,
          can_create: true,
          can_update: false,
          can_delete: false,
        },
      },
    },
    {
      name: "empty input",
      input: [],
      expected: {},
    },
  ] as const;

  it.each(cases)("when $name, then OR merges correctly", ({
    input,
    expected,
  }) => {
    const map = aggregateRolePermissions([...input]);
    expect(Object.fromEntries(map)).toEqual(expected);
  });
});

describe("applyPermissionOverrides", () => {
  it("when override denies read, then read is false", () => {
    const base = aggregateRolePermissions([
      {
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: false,
        can_delete: false,
      },
    ]);
    const result = applyPermissionOverrides(base, [
      {
        table_name: "posts",
        can_read: false,
        can_create: null,
        can_update: null,
        can_delete: null,
      },
    ]);
    expect(result.get("posts")).toEqual({
      can_read: false,
      can_create: true,
      can_update: false,
      can_delete: false,
    });
  });

  it("when override is null fields, then inherits role aggregate", () => {
    const base = aggregateRolePermissions([
      {
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);
    const result = applyPermissionOverrides(base, [
      {
        table_name: "posts",
        can_read: null,
        can_create: null,
        can_update: null,
        can_delete: null,
      },
    ]);
    expect(result.get("posts")).toEqual({
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });

  it("when override on unknown table, then starts from all false", () => {
    const base = aggregateRolePermissions([]);
    const result = applyPermissionOverrides(base, [
      {
        table_name: "new_table",
        can_read: true,
        can_create: null,
        can_update: null,
        can_delete: null,
      },
    ]);
    expect(result.get("new_table")).toEqual({
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });
});

describe("buildFullAccessPermissions", () => {
  it("when platform admin tables, then full RCUD on each", () => {
    const connId = "00000000-0000-4000-8000-000000000001";
    expect(buildFullAccessPermissions(connId, ["posts", "users"])).toEqual([
      {
        connection_id: connId,
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
      {
        connection_id: connId,
        table_name: "users",
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
    ]);
  });
});

describe("resolvePermissionsFromRows", () => {
  it("when roles and overrides combined, then resolves correctly", () => {
    const connId = "00000000-0000-4000-8000-000000000002";
    const result = resolvePermissionsFromRows(
      connId,
      [
        {
          table_name: "posts",
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      ],
      [
        {
          table_name: "posts",
          can_read: null,
          can_create: true,
          can_update: null,
          can_delete: null,
        },
      ],
    );
    expect(result).toEqual([
      {
        connection_id: connId,
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: false,
        can_delete: false,
      },
    ]);
  });
});

describe("resolvePermissionsRecord", () => {
  it("when same input as resolvePermissionsFromRows, then record shape matches", () => {
    const rolePerms = [
      {
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ];
    const overrides = [
      {
        table_name: "posts",
        can_read: false,
        can_create: null,
        can_update: null,
        can_delete: null,
      },
    ];
    expect(resolvePermissionsRecord(rolePerms, overrides)).toEqual({
      posts: {
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    });
  });
});

describe("column helpers", () => {
  it("isTextColumn detects text types", async () => {
    const {
      isTextColumn,
      isJsonColumn,
      isBooleanColumn,
      isNumericColumn,
      isDateColumn,
    } = await import("../src/index.js");
    expect(isTextColumn("character varying")).toBe(true);
    expect(isTextColumn("uuid")).toBe(true);
    expect(isJsonColumn("jsonb")).toBe(true);
    expect(isBooleanColumn("boolean")).toBe(true);
    expect(isNumericColumn("bigint")).toBe(true);
    expect(isDateColumn("timestamp with time zone")).toBe(true);
    expect(isTextColumn("integer")).toBe(false);
  });
});

describe("humanizeDbError", () => {
  it("when permission denied, then returns permissionDenied", async () => {
    const { humanizeDbError } = await import("../src/index.js");
    expect(
      humanizeDbError({
        message: "permission denied for table",
        code: "42501",
      }),
    ).toBe("permissionDenied");
  });

  it("when rls violation, then returns rlsViolation", async () => {
    const { humanizeDbError } = await import("../src/index.js");
    expect(
      humanizeDbError({
        message: "violates row-level security policy",
        code: "PGRST301",
      }),
    ).toBe("rlsViolation");
  });

  it("when duplicate key, then returns duplicateKey", async () => {
    const { humanizeDbError } = await import("../src/index.js");
    expect(
      humanizeDbError({
        message: "duplicate key value violates unique constraint",
      }),
    ).toBe("duplicateKey");
  });

  it("when unknown error, then returns message", async () => {
    const { humanizeDbError } = await import("../src/index.js");
    expect(humanizeDbError({ message: "something else" })).toBe(
      "something else",
    );
  });
});
