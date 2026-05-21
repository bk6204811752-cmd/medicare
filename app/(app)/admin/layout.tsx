import { requireSuperAdmin, requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  requireSuperAdmin(user);
  return children;
}
