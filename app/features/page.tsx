import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Barcode, BellRing, FileSpreadsheet, ReceiptText, ShieldCheck, Warehouse } from "lucide-react";

const features: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "Smart billing", body: "Fast POS with autocomplete, per-item discounts, GST, and payment modes.", icon: ReceiptText },
  { title: "Batch inventory", body: "Track batch, rack, supplier, MFG, expiry, MRP, sale rate, and reorder level.", icon: Warehouse },
  { title: "Barcode scan", body: "Use phone camera, manual barcode entry, or a USB scanner as keyboard input.", icon: Barcode },
  { title: "Expiry alerts", body: "Daily-ready expiry and low-stock signals before stock becomes a loss.", icon: BellRing },
  { title: "GST reports", body: "GSTR-friendly summaries with CSV export planned in the free stack.", icon: FileSpreadsheet },
  { title: "Compliance", body: "Schedule H/H1 prompts and printable digital registers.", icon: ShieldCheck }
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-med-mist px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-med-greenDark">MedCare</Link>
        <h1 className="mt-4 font-display text-4xl font-bold text-med-navy">Built for daily pharmacy work</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-med-green" />
              <h2 className="mt-4 font-display text-lg font-semibold text-med-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
