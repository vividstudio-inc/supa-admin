import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

const steps = [
  () => execSync("pnpm db:start", { stdio: "inherit" }),
  () => execSync("pnpm setup:env-local", { stdio: "inherit" }),
  () => execSync(supabaseCmd("db reset"), { stdio: "inherit" }),
  () =>
    execSync(supabaseCmd("db reset --workdir supabase-target"), {
      stdio: "inherit",
    }),
  () =>
    execSync("pnpm exec tsx scripts/seed-local-target.ts", {
      stdio: "inherit",
    }),
];

for (const step of steps) {
  step();
}
console.log("Local setup complete");
