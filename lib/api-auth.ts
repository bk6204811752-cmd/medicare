import { headers } from "next/headers";
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

  // Super admins must explicitly specify a tenant for scoped operations.
  // Regular users are scoped to their own tenant.
  let tenantId = user.tenantId;

  if (user.role === "super_admin") {
    const headersList = await headers();
    const explicitTenant = headersList.get("x-tenant-id") || headersList.get("X-Tenant-Id");
    if (explicitTenant) {
      tenantId = explicitTenant;
    }
  }

  if (!tenantId && user.role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tenant associated with this account." },
        { status: 403 }
      )
    };
  }

  // Super admin without explicit tenant — allowed for admin-wide endpoints,
  // but scoped endpoints should check for empty tenantId and reject.
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

/**
 * Require a stockist role (stockist_admin or stockist_staff). Returns 403 response if user is not a stockist.
 */
export function requireStockist(
  ctx: AuthenticatedContext
): NextResponse | null {
  if (ctx.user.role !== "stockist_admin" && ctx.user.role !== "stockist_staff" && ctx.user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Stockist access required." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Require a chemist/shop role. Returns 403 response if user is a stockist.
 */
export function requireChemist(
  ctx: AuthenticatedContext
): NextResponse | null {
  if (ctx.user.role === "stockist_admin" || ctx.user.role === "stockist_staff") {
    return NextResponse.json(
      { error: "Chemist access required." },
      { status: 403 }
    );
  }
  return null;
}
