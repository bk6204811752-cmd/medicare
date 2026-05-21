/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

const provider = process.env.DATABASE_PROVIDER || "sqlite";
console.log(`[postinstall] Detected DATABASE_PROVIDER = "${provider}"`);

try {
  if (provider === "sqlserver") {
    console.log("[postinstall] Generating Prisma Client for SQL Server...");
    execSync("npx prisma generate --schema=prisma/schema.azure.prisma", { stdio: "inherit" });
  } else {
    console.log("[postinstall] Generating Prisma Client for SQLite...");
    execSync("npx prisma generate --schema=prisma/schema.prisma", { stdio: "inherit" });
  }
} catch (error) {
  console.error("[postinstall] Failed to generate Prisma Client:", error.message || error);
  process.exit(1);
}
