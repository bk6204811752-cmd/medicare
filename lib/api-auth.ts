import { NextResponse } from "next/server";
import { type LocalUser } from "@/lib/local-db";
import { getCurrentUser } from "@/lib/auth";

export type AuthenticatedContext = {
  user: LocalUser;
  tenantId: string;
};

/**
 * Authenticate an API request using the session cookie.
 * Uses the cached getCurrentUser() — deduped within a single request.
 * Returns the authenticated user + tenantId, or a 401 JSON response.
 */
export async function authenticateApiRequest(): Promise<
  | { ok: true; ctx: AuthenticatedContext }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required. Please login." },
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
