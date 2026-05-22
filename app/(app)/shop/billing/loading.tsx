export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
        <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-12 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-12 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
