import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // During Vercel's 'postinstall' step, environment variables are not exposed.
    // We use standard process.env with a dummy fallback so 'prisma generate' can run
    // successfully without crashing on missing env variables.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
