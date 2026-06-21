import { describe, expect, it } from "vitest";
import {
  buildManualSetupSql,
  isSupaadminApplyRlsMissingError,
  isSupaadminBootstrapMissingError,
} from "../src/bootstrap-sql.js";

describe("bootstrap SQL helpers", () => {
  it("when building manual setup sql, then includes new RPC names", () => {
    const sql = buildManualSetupSql(["posts"]);
    expect(sql).toContain("supaadmin_bootstrap");
    expect(sql).toContain("supaadmin_apply_rls_sql");
    expect(sql).toContain("supaadmin_has_permission");
  });

  it("when PostgREST reports missing bootstrap rpc, then detects it", () => {
    expect(
      isSupaadminBootstrapMissingError(
        "Could not find the function public.supaadmin_bootstrap(tables) in the schema cache",
      ),
    ).toBe(true);
  });

  it("when PostgREST reports missing apply rpc, then detects it", () => {
    expect(
      isSupaadminApplyRlsMissingError(
        "Could not find the function public.supaadmin_apply_rls_sql(sql) in the schema cache",
      ),
    ).toBe(true);
  });
});

describe("supaadmin_apply_rls_sql allowlist (contract)", () => {
  it("when sql contains denied keywords, then function body rejects them", () => {
    const sql = buildManualSetupSql([]);
    expect(sql).toContain("COPY");
    expect(sql).toContain("denied keyword");
    expect(sql).toContain("statement not in allowlist");
  });
});
