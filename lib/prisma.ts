import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// ─── Retry helper for transient DB failures ──────────────────
// SQLite can have busy/locked issues under concurrent access.
// This retries with exponential backoff.

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
    msg.includes("server is not ready") ||
    msg.includes("database is locked") ||
    (msg.includes("sqlite") && msg.includes("busy"))
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

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

export const prisma = basePrisma.$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      return withRetry(() => query(args));
    },
  },
}) as unknown as PrismaClient;
