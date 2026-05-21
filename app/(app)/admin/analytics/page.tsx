import { ChartNoAxesCombined } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { getPlatformSummary } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  const summary = await getPlatformSummary();

  return (
    <ModulePage
      title="Platform Analytics"
      description="Platform-wide metrics across all tenants."
      icon={ChartNoAxesCombined}
      items={[
        { label: "Bills generated", value: String(summary.bills), hint: "Across all shops" },
        { label: "GMV", value: formatCurrency(summary.gmvPaisa), hint: "Total bill value" },
        { label: "Active shops", value: String(summary.activeShops), hint: `${summary.totalShops} total` },
        { label: "Users", value: String(summary.users), hint: "All platform users" }
      ]}
    />
  );
}
