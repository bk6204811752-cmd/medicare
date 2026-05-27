/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

console.log("[postinstall] Generating Prisma Client...");
try {
  execSync("npx prisma generate --schema=prisma/schema.prisma", { stdio: "inherit" });
} catch (error) {
  console.error("[postinstall] Failed to generate Prisma Client:", error.message || error);
  process.exit(1);
}
