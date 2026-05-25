/* eslint-disable @typescript-eslint/no-require-imports */

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const { execFileSync } = require("node:child_process");
const sql = require("mssql");

function cleanEnv(val) {
  return (val || "").replace(/[\r\n]+/g, "").trim();
}

const server = cleanEnv(process.env.AZURE_SQL_SERVER || "basant-server.database.windows.net");
const database = cleanEnv(process.env.AZURE_SQL_DATABASE || "myfree-db");
const user = cleanEnv(process.env.AZURE_SQL_USER || "basantadmin");
const password = cleanEnv(process.env.AZURE_SQL_PASSWORD || "Neha@141517");

const config = {
  server,
  port: Number(cleanEnv(process.env.AZURE_SQL_PORT || "1433")),
  database,
  user,
  password,
  options: { encrypt: true, trustServerCertificate: false },
  connectionTimeout: 30000,
  requestTimeout: 120000
};

function prismaBin() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

(async () => {
  console.log(`Connecting to Azure SQL: ${server}/${database} as ${user}...`);
  const pool = await sql.connect(config);
  try {
    const url = cleanEnv(process.env.AZURE_DATABASE_URL);
    console.log("Generating database migration diff script via Prisma...");
    const migrationSql = execFileSync(
      prismaBin(),
      ["prisma", "migrate", "diff", "--from-url", url, "--to-schema-datamodel", "prisma/schema.azure.prisma", "--script"],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        shell: true
      }
    );

    const cleanSql = migrationSql.replace(/--.*$/gm, "").trim();
    if (cleanSql.length > 0) {
      console.log("Applying database migrations to Azure SQL...");
      await pool.request().batch(migrationSql);
      console.log("Azure SQL database migrated successfully!");
    } else {
      console.log("Azure SQL database is already fully in sync with schema.");
    }
  } finally {
    await pool.close();
  }
})().catch((error) => {
  console.error("Setup failed:", error && error.message ? error.message : error);
  const nested = error?.originalError?.errors ?? error?.errors;
  if (Array.isArray(nested)) {
    for (const item of nested) {
      console.error("  -", item?.message ?? item);
    }
  }
  process.exit(1);
});
