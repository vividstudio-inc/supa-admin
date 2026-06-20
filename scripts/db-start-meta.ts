import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

execSync(supabaseCmd("start"), { stdio: "inherit" });
console.log("Meta Supabase started");
