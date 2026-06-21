import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

run(supabaseCmd("start"));
run(supabaseCmd("start --workdir supabase-target"));
run("docker compose up -d redis");
console.log("Meta + Target Supabase + Redis started");
