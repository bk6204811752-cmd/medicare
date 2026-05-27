import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma 7 Configuration
 *
 * In Prisma 7, the database URL is no longer set in schema.prisma.
 * Instead, it is passed here for CLI operations (generate, migrate, db push).
 *
 * The PrismaClient in lib/prisma.ts already uses the adapter pattern for
 * runtime connections — this file is only used by the Prisma CLI.
 *
 * DIRECT_URL is used for migrations (bypasses PgBouncer).
 * DATABASE_URL (pooled) is the runtime connection used by lib/prisma.ts.
 */

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  migrate: {
    async adapter(env) {
      const connectionString = env["DIRECT_URL"] ?? env["DATABASE_URL"];
      if (!connectionString) {
        throw new Error(
          "Missing DATABASE_URL or DIRECT_URL environment variable for Prisma migrations."
        );
      }
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
