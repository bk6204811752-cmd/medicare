import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
  getUserBySession as dbGetUserBySession,
  type LocalUser
} from "@/lib/local-db";

export const SESSION_COOKIE = "medcare_session";

// Re-export LocalUser so consumers can import from auth.ts
export type { LocalUser } from "@/lib/local-db";

/**
 * Create a new session for a user and set the auth cookie
 */
export async function setAuthSession(userId: string) {
  const { sessionId, expiresAt } = await dbCreateSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    // Use secure cookies in production (Vercel HTTPS).
    // Keep false for local network/offline-first dev installations on HTTP.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

/**
 * Clear the auth session cookie and delete the session from DB
 */
export async function clearAuthSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) await dbDeleteSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Request-scoped dedup: layout + admin layout + page can all call this,
 * but only 1 DB query happens per server request.
 */
export const getCurrentUser = cache(async (): Promise<LocalUser | null> => {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;
    return await dbGetUserBySession(sessionId);
  } catch (error) {
    // Rethrow Next.js internal dynamic rendering and redirect errors so that Next.js compiles them dynamically
    if (error instanceof Error && (
      error.message.includes("Dynamic server usage") || 
      error.message.includes("NEXT_REDIRECT") ||
      (error as any).digest === "DYNAMIC_SERVER_USAGE"
    )) {
      throw error;
    }
    console.error("Failed to get current user session:", error);
    return null;
  }
});

/**
 * Require an authenticated user. Redirects to login if not found.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?message=Please login first");
  return user;
}

/**
 * Require super_admin role. Redirects to shop dashboard if not admin.
 */
export function requireSuperAdmin(user: LocalUser) {
  if (user.role !== "super_admin") {
    redirect("/shop/dashboard");
  }
}
