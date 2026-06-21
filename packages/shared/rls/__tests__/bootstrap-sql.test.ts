import { describe, expect, it } from "vitest";
import {
  buildBootstrapApplySql,
  buildManualSetupSql,
  isExecSqlMissingError,
} from "../src/bootstrap-sql.js";

describe("buildManualSetupSql", () => {
  it("when tables provided, then includes bootstrap RPCs, helper, and GRANT", () => {
    const sql = buildManualSetupSql(["posts", "comments"]);
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.supaadmin_bootstrap",
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.supaadmin_apply_rls_sql",
    );
    expect(sql).toContain("supaadmin_has_permission");
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON "posts", "comments"',
    );
    expect(sql).toContain("TO service_role");
  });

  it("when no tables, then includes commented GRANT fallback", () => {
    const sql = buildManualSetupSql([]);
    expect(sql).toContain("supaadmin_bootstrap");
    expect(sql).toContain("No synced tables yet");
  });

  it("when table name contains quotes, then escapes identifiers", () => {
    const sql = buildManualSetupSql(['evil"table']);
    expect(sql).toContain('"evil""table"');
  });
});

describe("buildBootstrapApplySql", () => {
  it("when tables provided, then includes helper and GRANT only", () => {
    const sql = buildBootstrapApplySql(["posts"]);
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION public.exec_sql");
    expect(sql).toContain("supaadmin_has_permission");
    expect(sql).toContain('"posts"');
  });
});

describe("isExecSqlMissingError", () => {
  it("when function not found message, then returns true", () => {
    expect(
      isExecSqlMissingError(
        "Could not find the function public.exec_sql(query) in the schema cache",
      ),
    ).toBe(true);
  });

  it("when unrelated error, then returns false", () => {
    expect(isExecSqlMissingError("permission denied")).toBe(false);
  });
});
