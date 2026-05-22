export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-slate-200 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-12 bg-slate-100 animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-t border-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  );
}
