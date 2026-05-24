import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "green" | "orange" | "red" | "blue" | "purple";
  trend?: { value: number; positive: boolean };
};

const tones = {
  green: { bg: "bg-emerald-50", border: "border-l-med-green", icon: "text-med-greenDark", trendUp: "text-emerald-600", trendDown: "text-red-500" },
  orange: { bg: "bg-orange-50", border: "border-l-med-orange", icon: "text-orange-700", trendUp: "text-emerald-600", trendDown: "text-red-500" },
  red: { bg: "bg-red-50", border: "border-l-red-500", icon: "text-red-700", trendUp: "text-emerald-600", trendDown: "text-red-500" },
  blue: { bg: "bg-sky-50", border: "border-l-sky-500", icon: "text-sky-700", trendUp: "text-emerald-600", trendDown: "text-red-500" },
  purple: { bg: "bg-purple-50", border: "border-l-purple-500", icon: "text-purple-700", trendUp: "text-emerald-600", trendDown: "text-red-500" }
};

export function StatCard({ title, value, hint, icon: Icon, tone = "green", trend }: StatCardProps) {
  const t = tones[tone];
  return (
    <section className="glass-card p-3.5 xs:p-4 sm:p-5 hover:scale-[1.02] transition-transform animate-slide-up hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl border-l-4 transition-colors", t.bg, t.border, t.icon)}>
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold", trend.positive ? "bg-emerald-50 " + t.trendUp : "bg-red-50 " + t.trendDown)}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-sm text-slate-500 font-medium truncate">{title}</p>
      <p className="mt-0.5 sm:mt-1 font-display text-lg sm:text-2xl font-bold text-med-navy tracking-tight truncate">{value}</p>
      <p className="mt-1 sm:mt-1.5 text-[9px] sm:text-xs text-slate-400 font-medium truncate">{hint}</p>
    </section>
  );
}
