import { describe, expect, it } from "vitest";
import { mergePermissions } from "../src/index.js";

describe("mergePermissions", () => {
  it("uses role permissions when no override", () => {
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

  it("override takes precedence", () => {
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
});
