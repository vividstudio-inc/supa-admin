import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function loadEnv() {
  const envPath = join(process.cwd(), "apps/web/.env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]!] = match[2]!.replace(/^"|"$/g, "");
  }
}

loadEnv();

const url = process.env.LOCAL_TARGET_SUPABASE_URL ?? "http://127.0.0.1:54421";
const anonKey = process.env.LOCAL_TARGET_SUPABASE_ANON_KEY;
const serviceKey = process.env.LOCAL_TARGET_SUPABASE_SERVICE_ROLE_KEY;
const metaUrl =
  process.env.NEXT_PUBLIC_META_SUPABASE_URL ?? "http://127.0.0.1:54321";
const metaServiceKey = process.env.META_SUPABASE_SERVICE_ROLE_KEY;
const encKey = process.env.ENCRYPTION_KEY;

if (!anonKey || !serviceKey || !metaServiceKey || !encKey) {
  console.error("Missing env vars — run pnpm setup:env-local first");
  process.exit(1);
}

const meta = createClient(metaUrl, metaServiceKey);

async function main() {
  const { data: existing } = await meta
    .from("connections")
    .select("id")
    .limit(1);
  if (existing && existing.length > 0) {
    console.log("Connection already seeded");
    return;
  }

  const { error } = await meta.from("connections").insert({
    name: "Local Target",
    url,
    anon_key_enc: encrypt(anonKey, encKey),
    service_role_enc: encrypt(serviceKey, encKey),
  });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log("Seeded Local Target connection");
}

void main();
