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
    secure: process.env.NODE_ENV === "production",
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
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return await getUserBySession(sessionId);
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
