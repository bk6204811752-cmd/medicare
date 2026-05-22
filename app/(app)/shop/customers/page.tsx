import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getCustomers } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const customers = await getCustomers(user?.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer ledger, phone lookup, loyalty, doctors, and credit outstanding."
        action={
          <Link href="/shop/customers/add" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-4 font-semibold text-white hover:bg-med-greenDark">
            <Plus className="h-4 w-4" /> Add customer
          </Link>
        }
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => (
          <article key={customer.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Link href={`/shop/customers/${encodeURIComponent(customer.id)}`} className="font-display text-lg font-semibold text-med-navy hover:text-med-greenDark hover:underline">
              {String(customer.name)}
            </Link>
            <p className="mt-1 text-sm text-slate-500">{String(customer.phone || "Walk-in billing profile")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Outstanding</p>
                <p className="font-semibold text-med-navy">{formatCurrency(Number(customer.outstandingPaisa))}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Loyalty</p>
                <p className="font-semibold text-med-navy">{Number(customer.loyaltyPoints)} pts</p>
              </div>
            </div>
            {customer.doctorName ? <p className="mt-3 text-sm text-slate-500">Doctor: {String(customer.doctorName)}</p> : null}
          </article>
        ))}
      </section>
    </>
  );
}
