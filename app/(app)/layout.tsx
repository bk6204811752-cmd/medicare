import { AppShell } from "@/components/app-shell";
import { FullscreenTrigger } from "@/components/fullscreen-trigger";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Fetch profile picture URL from database for sidebar and header display
  let profilePicUrl: string | null = null;
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { profilePicUrl: true },
    });
    profilePicUrl = tenant?.profilePicUrl ?? null;
  }

  return (
    <AppShell user={user} profilePicUrl={profilePicUrl}>
      <FullscreenTrigger />
      {children}
    </AppShell>
  );
}
