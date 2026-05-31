import { notFound } from "next/navigation";
import { getPublicSaleByIdOrInvoice } from "@/lib/local-db";
import { BillDetailClient } from "@/app/(app)/shop/billing/[id]/BillDetailClient";

export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  // Fetch the invoice details publicly (no auth required)
  const record = await getPublicSaleByIdOrInvoice(decodedId);

  if (!record || !record.sale) {
    notFound();
  }

  const sale = record.sale as Record<string, unknown>;
  const items = record.items as Record<string, unknown>[];
  const tenant = record.tenant as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 sm:p-8">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-150 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight font-display">Official Invoice Document</h1>
            <p className="text-xs text-slate-450 font-semibold mt-0.5">Shared via Medicare Pharmacy Platform</p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-250 shadow-3xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Verified Secure</span>
          </div>
        </div>

        <BillDetailClient 
          sale={sale} 
          items={items} 
          tenant={tenant} 
          initialFormat="a4"
        />
      </div>
    </div>
  );
}
