/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();
console.log(`[build] Detected DATABASE_PROVIDER = "${provider}"`);

try {
  if (provider === "sqlserver") {
    console.log("[build] Generating Prisma Client for SQL Server...");
    execSync("npx prisma generate --schema=prisma/schema.azure.prisma", { stdio: "inherit" });
  } else {
    console.log("[build] Generating Prisma Client for SQLite...");
    execSync("npx prisma generate --schema=prisma/schema.prisma", { stdio: "inherit" });
  }
} catch (error) {
  console.error("[build] Failed to generate Prisma Client:", error.message || error);
  process.exit(1);
}

console.log("[build] Running next build...");
try {
  execSync("next build", { stdio: "inherit" });
} catch (error) {
  console.error("[build] next build failed:", error.message || error);
  process.exit(1);
}
