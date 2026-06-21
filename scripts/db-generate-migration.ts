import { execSync } from "node:child_process";
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

execSync("pnpm --filter @supa-admin/db db:generate", {
  stdio: "inherit",
  env: { ...process.env, CI: "true" },
});

const drizzleFiles = readdirSync(migrationsDir)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();

for (const file of drizzleFiles) {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const suffix = file.replace(/^\d{4}_/, "");
  const target = `${timestamp}_${suffix}`;
  renameSync(join(migrationsDir, file), join(migrationsDir, target));
  console.log(`Renamed ${file} -> ${target}`);
}
