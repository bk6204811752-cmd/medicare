/* eslint-disable @typescript-eslint/no-require-imports */

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

process.env.DATABASE_PROVIDER = "sqlserver";
process.env.AZURE_DATABASE_URL ??=
  "sqlserver://basant-server.database.windows.net:1433;database=myfree-db;encrypt=true;trustServerCertificate=false;connectionTimeout=30000;authentication=DefaultAzureCredential";

require("./seed");
