import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// ─── Env sanitization ───────────────────────────────────────
// Vercel env vars can have trailing \r\n from the dashboard or CLI.
// Strip them to prevent "Failed to connect" errors.
function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/[\r\n]+/g, "").trim();
}

const provider = cleanEnv(process.env.DATABASE_PROVIDER);
const useAzureSql = provider === "sqlserver";

function createPrismaClient() {
  if (useAzureSql) {
    let url = cleanEnv(process.env.AZURE_DATABASE_URL);
    if (!url) {
      throw new Error(
        "AZURE_DATABASE_URL is required when DATABASE_PROVIDER=sqlserver.\n" +
          "Format: sqlserver://HOST:1433;database=DB;user=USER;password={PASS};encrypt=true"
      );
    }

    // Ensure connection timeout is set for Azure SQL cold starts
    if (!url.toLowerCase().includes("connectiontimeout")) {
      url += ";connectionTimeout=30000";
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

// ─── Retry helper for transient DB failures ──────────────────
// Azure SQL free-tier cold starts can take 3–10s.
// A single TCP timeout kills the request. This retries with backoff.

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("could not connect") ||
    msg.includes("failed to connect") ||
    msg.includes("connection") && msg.includes("sequence") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("timed out") ||
    msg.includes("connection pool") ||
    msg.includes("server is not ready")
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && isTransientError(error)) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        if (process.env.NODE_ENV === "development") {
          console.warn(`[Prisma retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`, (error as Error).message);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}
