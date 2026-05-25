"use client";

import { useRouter, usePathname } from "next/navigation";

export function GstReportFilter({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleMonthChange = (val: string) => {
    if (!val) return;
    router.push(`${pathname}?month=${val}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
      <div className="flex flex-col gap-1">
        <label htmlFor="gst-month-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Select Tax Month
        </label>
        <input
          id="gst-month-select"
          type="month"
          value={currentMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green transition-all"
        />
      </div>
      
      <div className="flex-1 flex justify-end items-end self-end">
        <a
          href={`/api/export/gst?month=${currentMonth}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-med-green px-5 py-2 text-sm font-bold text-white hover:bg-med-green/90 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/10"
        >
          📥 Export GSTR-1 CSV
        </a>
      </div>
    </div>
  );
}
