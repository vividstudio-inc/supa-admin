import { describe, expect, it } from "vitest";
import { parseForeignKeyFromOpenApiDescription } from "../src/parse-foreign-key.js";

describe("parseForeignKeyFromOpenApiDescription", () => {
  it("when fk tag present, then parses table and column", () => {
    const result = parseForeignKeyFromOpenApiDescription(
      "Note:\nThis is a Foreign Key to `posts.id`.<fk table='posts' column='id'/>",
    );
    expect(result).toEqual({ table: "posts", column: "id" });
  });

  it("when only text description present, then parses table and column", () => {
    const result = parseForeignKeyFromOpenApiDescription(
      "Note:\nThis is a Foreign Key to `posts.id`.",
    );
    expect(result).toEqual({ table: "posts", column: "id" });
  });

  it("when no foreign key info, then returns null", () => {
    expect(parseForeignKeyFromOpenApiDescription(undefined)).toBeNull();
    expect(parseForeignKeyFromOpenApiDescription("plain column")).toBeNull();
  });
});
