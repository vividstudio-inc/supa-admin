import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

try {
  execSync(supabaseCmd("stop"), { stdio: "inherit" });
} catch {
  /* may not be running */
}
try {
  execSync(supabaseCmd("stop --workdir supabase-target"), { stdio: "inherit" });
} catch {
  /* may not be running */
}
console.log("Meta + Target Supabase stopped");
