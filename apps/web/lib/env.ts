import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const WEAK_ENCRYPTION_KEYS = new Set([
  "",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
]);

export const env = createEnv({
  server: {
    META_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    ENCRYPTION_KEY: z
      .string()
      .length(64)
      .refine((v) => !WEAK_ENCRYPTION_KEYS.has(v), {
        message: "ENCRYPTION_KEY must not be a known weak/default value",
      }),
    SETUP_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url().optional(),
    CSP_EXTRA_CONNECT_SRC: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_META_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_META_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:3000"),
  },
  runtimeEnv: {
    META_SUPABASE_SERVICE_ROLE_KEY: process.env.META_SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SETUP_SECRET: process.env.SETUP_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    CSP_EXTRA_CONNECT_SRC: process.env.CSP_EXTRA_CONNECT_SRC,
    NEXT_PUBLIC_META_SUPABASE_URL: process.env.NEXT_PUBLIC_META_SUPABASE_URL,
    NEXT_PUBLIC_META_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_META_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
