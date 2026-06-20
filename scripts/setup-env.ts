import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const example = join(root, ".env.example");
const target = join(root, "apps/web/.env.local");

if (!existsSync(example)) {
  console.error(".env.example not found");
  process.exit(1);
}

mkdirSync(join(root, "apps/web"), { recursive: true });
copyFileSync(example, target);
console.log(`Copied .env.example → apps/web/.env.local`);
