import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

run(supabaseCmd("start"));
run(supabaseCmd("start --workdir supabase-target"));
console.log("Meta + Target Supabase started");
