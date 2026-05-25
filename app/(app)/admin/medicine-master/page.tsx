import { Pill } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getMedicines } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function MedicineMasterPage() {
  const medicines = await getMedicines();

  return (
    <>
      <PageHeader title="Medicine Master" description="Global medicine database with HSN, GST, schedule, barcode, and prescription metadata." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {medicines.map((medicine: any) => (
          <article key={medicine.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Pill className="h-5 w-5 text-med-green" />
            <h2 className="mt-3 font-display text-lg font-semibold text-med-navy">{medicine.name}</h2>
            <p className="text-sm text-slate-500">{medicine.composition}</p>
            <p className="mt-3 text-sm text-slate-500">GST {medicine.gstRate}% | {medicine.schedule} | {formatCurrency(medicine.mrpPaisa)}</p>
          </article>
        ))}
      </section>
    </>
  );
}
