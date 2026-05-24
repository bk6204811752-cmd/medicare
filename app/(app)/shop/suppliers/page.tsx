import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getSuppliers } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  const suppliers = await getSuppliers(user?.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Distributor contacts, GSTIN, credit terms, and payable balances."
        action={
          <Link href="/shop/suppliers/add" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-4 font-semibold text-white hover:bg-med-greenDark">
            <Plus className="h-4 w-4" /> Add supplier
          </Link>
        }
      />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {["Supplier", "Phone", "GSTIN", "Credit days", "Payable"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/shop/suppliers/${encodeURIComponent(supplier.id)}`} className="font-semibold text-med-navy hover:text-med-greenDark hover:underline">
                      {String(supplier.name)}
                    </Link>
                    {supplier.email ? <p className="text-xs text-slate-500">{supplier.email}</p> : null}
                  </td>
                  <td className="px-4 py-3">{String(supplier.phone ?? "")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(supplier.gstin ?? "")}</td>
                  <td className="px-4 py-3">{Number(supplier.creditDays)}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(supplier.balancePaisa))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
