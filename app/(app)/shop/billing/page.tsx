import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingPos } from "@/components/billing-pos";
import { getCurrentUser } from "@/lib/auth";
import { getTenant } from "@/lib/local-db";

export default async function BillingPage() {
  const user = await getCurrentUser();
  const tenant = await getTenant(user?.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Smart Billing POS"
        description="Keyboard-friendly billing with GST, Schedule H checks, barcode scan, print, and free WhatsApp deep-link sharing."
        action={
          <Link href="/shop/billing/history" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
            <History className="h-4 w-4 text-slate-500" />
            Billing History
          </Link>
        }
      />
      <BillingPos tenant={tenant as any} />
    </>
  );
}
