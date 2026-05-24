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
      stdio: ["ignore", "pipe", "inherit"],
      shell: true
    }
  );
}

(async () => {
  console.log(`Connecting to Azure SQL: ${server}/${database} as ${user}...`);
  const pool = await sql.connect(config);
  try {
    const exists = await pool.request().query("SELECT OBJECT_ID(N'dbo.Tenant', N'U') AS tableId");
    if (exists.recordset[0]?.tableId) {
      console.log("Azure SQL schema already exists. Checking for missing columns/tables...");
      const upiIdExists = await pool.request().query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'upiId'"
      );
      if (upiIdExists.recordset.length === 0) {
        console.log("Adding upiId column to Tenant table...");
        await pool.request().query("ALTER TABLE dbo.Tenant ADD upiId NVARCHAR(120) NULL");
        console.log("upiId column added successfully.");
      } else {
        console.log("upiId column already exists.");
      }

      // Check and add address
      const addressExists = await pool.request().query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'address'"
      );
      if (addressExists.recordset.length === 0) {
        console.log("Adding address column to Tenant table...");
        await pool.request().query("ALTER TABLE dbo.Tenant ADD address NVARCHAR(1000) NULL");
        console.log("address column added successfully.");
      }

      // Check and add profilePicUrl
      const profilePicUrlExists = await pool.request().query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'profilePicUrl'"
      );
      if (profilePicUrlExists.recordset.length === 0) {
        console.log("Adding profilePicUrl column to Tenant table...");
        await pool.request().query("ALTER TABLE dbo.Tenant ADD profilePicUrl NVARCHAR(1000) NULL");
        console.log("profilePicUrl column added successfully.");
      }

      // Check and create PrescriptionImage table if missing
      const prescTableExists = await pool.request().query(
        "SELECT OBJECT_ID(N'dbo.PrescriptionImage', N'U') AS tableId"
      );
      if (!prescTableExists.recordset[0]?.tableId) {
        console.log("Creating PrescriptionImage table...");
        await pool.request().query(`
          CREATE TABLE dbo.PrescriptionImage (
            id NVARCHAR(64) NOT NULL CONSTRAINT PK_PrescriptionImage PRIMARY KEY (id),
            tenantId NVARCHAR(64) NOT NULL,
            saleId NVARCHAR(64) NULL,
            imageUrl NVARCHAR(1000) NOT NULL,
            doctorName NVARCHAR(255) NULL,
            patientName NVARCHAR(255) NULL,
            notes NVARCHAR(1000) NULL,
            uploadedAt DATETIME2 NOT NULL CONSTRAINT DF_PrescriptionImage_uploadedAt DEFAULT GETDATE(),
            CONSTRAINT FK_PrescriptionImage_Tenant FOREIGN KEY (tenantId) REFERENCES dbo.Tenant(id),
            CONSTRAINT FK_PrescriptionImage_Sale FOREIGN KEY (saleId) REFERENCES dbo.Sale(id)
          )
        `);
        console.log("PrescriptionImage table created successfully.");
      }
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
