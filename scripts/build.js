/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

console.log("[build] Generating Prisma Client...");
try {
  execSync("npx prisma generate --schema=prisma/schema.prisma", { stdio: "inherit" });
  console.log("[build] Synchronizing database schema...");
  execSync("npx prisma db push", { stdio: "inherit" });
} catch (error) {
  console.error("[build] Failed to generate Prisma Client / sync database:", error.message || error);
  process.exit(1);
}

// ─── Pre-build medicine database index ────────────────────────
const fs = require("fs");
const indexPath = require("path").join(__dirname, "..", "data", "medicine-index");
const csvPath = require("path").join(__dirname, "..", "Indian_Medicine_Database_246k.csv");

if (!fs.existsSync(indexPath) && fs.existsSync(csvPath)) {
  console.log("[build] Building partitioned medicine database index from CSV...");
  try {
    execSync("node scripts/build-medicine-index.js", { stdio: "inherit" });
  } catch (err) {
    console.warn("[build] Partitioned medicine index build failed (non-fatal):", err.message || err);
  }
} else if (fs.existsSync(indexPath)) {
  console.log("[build] Partitioned medicine index already exists, skipping rebuild.");
} else {
  console.warn("[build] No CSV or index directory found — medicine search will be empty.");
}

console.log("[build] Running next build...");
try {
  execSync("next build", { stdio: "inherit" });
} catch (error) {
  console.error("[build] next build failed:", error.message || error);
  process.exit(1);
}
