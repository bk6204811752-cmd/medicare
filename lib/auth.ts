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
  await deleteSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return await getUserBySession(cookieStore.get(SESSION_COOKIE)?.value);
}

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
