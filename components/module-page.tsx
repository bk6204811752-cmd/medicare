import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export function ModulePage({
  title,
  description,
  icon: Icon,
  actions,
  items
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <>
      <PageHeader title={title} description={description} action={actions} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-med-greenSoft text-med-greenDark">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-med-navy">{item.value}</p>
            {item.hint ? <p className="mt-2 text-sm text-slate-500">{item.hint}</p> : null}
          </article>
        ))}
      </section>
    </>
  );
}
