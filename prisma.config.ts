import path from "path";
import fs from "fs";
import { defineConfig } from "prisma/config";

// Prisma's defineConfig does NOT auto-load .env files the way the legacy
// Prisma CLI did. We manually parse .env so DIRECT_URL / DATABASE_URL are
// available when running `npx prisma migrate dev` or `npx prisma db push`.
function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Only set if not already present (later files win by being loaded first)
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// Load .env.local first (higher priority), then .env (base)
// But skip the SQLite override in .env.local for DATABASE_URL since schema is PostgreSQL
loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // DIRECT_URL = non-pooled Supabase connection (required for migrations)
    // DATABASE_URL = pgbouncer pooled connection (used at runtime)
    // Fallback for Vercel postinstall where no env is available
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
