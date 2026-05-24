import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, getUserBySession, type LocalUser } from "@/lib/local-db";

export const SESSION_COOKIE = "medcare_session";

export async function setAuthSession(userId: string) {
  const { sessionId, expiresAt } = await createSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    // Changed to false for local network/offline-first installations.
    // Local pharmacy deployments run on HTTP IP addresses (e.g. http://192.168.x.x:3000).
    // In production mode, secure: true causes mobile browsers to block the cookie,
    // which breaks mobile authentication. Setting secure: false resolves this.
    secure: false,
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) await deleteSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
}

// Request-scoped dedup: layout + admin layout + page can all call this,
// but only 1 DB query happens per server request.
export const getCurrentUser = cache(async () => {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;
    return await getUserBySession(sessionId);
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

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?message=Please login first");
  return user;
}

export function requireSuperAdmin(user: LocalUser) {
  if (user.role !== "super_admin") {
    redirect("/shop/dashboard");
  }
}
