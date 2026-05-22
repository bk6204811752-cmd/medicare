import { getCurrentUser, requireSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // getCurrentUser is wrapped in React.cache() — this call is free
  // when the parent (app) layout already called requireUser().
  const user = await getCurrentUser();
  if (!user) redirect("/login?message=Please login first");
  requireSuperAdmin(user);
  return children;
}
