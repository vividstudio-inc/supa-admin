import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

execSync(supabaseCmd("start --workdir supabase-target"), { stdio: "inherit" });
console.log("Target Supabase started");
