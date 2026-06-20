import { writeFileSync } from "node:fs";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { contract } from "../src/index";

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const spec = await generator.generate(contract, {
  info: { title: "SupaAdmin API", version: "0.1.0" },
});

writeFileSync(
  new URL("../spec.json", import.meta.url),
  JSON.stringify(spec, null, 2),
);
console.log("Generated spec.json");
