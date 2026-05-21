/* eslint-disable @typescript-eslint/no-require-imports */

const { execFileSync } = require("node:child_process");
const sql = require("mssql");

const server = process.env.AZURE_SQL_SERVER || "basant-server.database.windows.net";
const database = process.env.AZURE_SQL_DATABASE || "myfree-db";
const user = process.env.AZURE_SQL_USER || "basantadmin";
const password = process.env.AZURE_SQL_PASSWORD || "Neha@141517";

const config = {
  server,
  port: Number(process.env.AZURE_SQL_PORT || 1433),
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

function schemaSql() {
  return execFileSync(
    prismaBin(),
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.azure.prisma", "--script"],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"]
    }
  );
}

(async () => {
  console.log(`Connecting to Azure SQL: ${server}/${database} as ${user}...`);
  const pool = await sql.connect(config);
  try {
    const exists = await pool.request().query("SELECT OBJECT_ID(N'dbo.Tenant', N'U') AS tableId");
    if (exists.recordset[0]?.tableId) {
      console.log("Azure SQL schema already exists. Skipping table creation.");
      return;
    }

    console.log("Creating schema...");
    await pool.request().batch(schemaSql());
    console.log("Azure SQL schema created successfully.");
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
