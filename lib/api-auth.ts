import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserBySession, type LocalUser } from "@/lib/local-db";
import { SESSION_COOKIE } from "@/lib/auth";

export type AuthenticatedContext = {
  user: LocalUser;
  tenantId: string;
};

/**
 * Authenticate an API request using the session cookie.
 * Returns the authenticated user + tenantId, or a 401 JSON response.
 */
export async function authenticateApiRequest(): Promise<
  | { ok: true; ctx: AuthenticatedContext }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required. Please login." },
        { status: 401 }
      )
    };
  }

  const user = await getUserBySession(sessionId);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session expired. Please login again." },
        { status: 401 }
      )
    };
  }

  // Super admins can access all tenants — use a query param or the first tenant
  // Regular users are scoped to their own tenant
  const tenantId = user.tenantId;

  if (!tenantId && user.role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tenant associated with this account." },
        { status: 403 }
      )
    };
  }

  return {
    ok: true,
    ctx: { user, tenantId: tenantId ?? "" }
  };
}

/**
 * Require super_admin role. Returns 403 if user is not super_admin.
 */
export function requireAdmin(
  ctx: AuthenticatedContext
): NextResponse | null {
  if (ctx.user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }
  return null;
}
