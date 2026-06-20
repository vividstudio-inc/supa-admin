import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

try {
  execSync(supabaseCmd("status"), { stdio: "pipe" });
} catch {
  execSync("pnpm db:start:meta", { stdio: "inherit" });
}

execSync("pnpm test:turbo", { stdio: "inherit" });
