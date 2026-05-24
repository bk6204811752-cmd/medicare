import "dotenv/config";
import { defineConfig } from "prisma/config";

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();
const schema = provider === "sqlserver" ? "prisma/schema.azure.prisma" : "prisma/schema.prisma";

export default defineConfig({
  schema,
  migrations: {
    seed: "node prisma/seed.js",
  },
});
