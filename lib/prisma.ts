import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const useAzureSql = process.env.DATABASE_PROVIDER === "sqlserver";

function createPrismaClient() {
  if (useAzureSql) {
    const url = process.env.AZURE_DATABASE_URL;
    if (!url) {
      throw new Error(
        "AZURE_DATABASE_URL is required when DATABASE_PROVIDER=sqlserver.\n" +
          "Format: sqlserver://HOST:1433;database=DB;user=USER;password={PASS};encrypt=true"
      );
    }

    // Dynamic import avoids bundling mssql when using SQLite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaMssql } = require("@prisma/adapter-mssql");

    return new PrismaClient({
      adapter: new PrismaMssql(url),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
