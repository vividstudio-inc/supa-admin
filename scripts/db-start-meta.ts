import { execSync } from "node:child_process";
import { supabaseCmd } from "./lib/supabase-cli";

const excludes = process.env.CI
  ? "-x studio,inbucket,imgproxy,edge-runtime"
  : "";

execSync(supabaseCmd(`start ${excludes}`.trim()), { stdio: "inherit" });
console.log("Meta Supabase started");
