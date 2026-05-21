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
    <section className="glass-card p-5 hover:scale-[1.02] transition-transform animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border-l-4", t.bg, t.border, t.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", trend.positive ? "bg-emerald-50 " + t.trendUp : "bg-red-50 " + t.trendDown)}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500">{title}</p>
      <p className="mt-1 font-display text-2xl font-bold text-med-navy tracking-tight">{value}</p>
      <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
    </section>
  );
}
