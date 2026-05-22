import { UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/auth";
import { getCustomers } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const customer = (await getCustomers(user?.tenantId ?? "")).find((item) => item.id === decodeURIComponent(id));
  if (!customer) notFound();

  return (
    <ModulePage
      title={customer.name}
      description="Customer profile, ledger, credit, and prescription context."
      icon={UserRound}
      items={[
        { label: "Phone", value: customer.phone || "Not set", hint: "Used for POS lookup" },
        { label: "Outstanding", value: formatCurrency(customer.outstandingPaisa), hint: "Credit balance" },
        { label: "Doctor", value: customer.doctorName || "Not set", hint: "Auto-fills POS when selected" },
        { label: "Email", value: customer.email || "Not set", hint: customer.address || "No address saved" },
        { label: "Loyalty", value: `${customer.loyaltyPoints} pts`, hint: "Available for future rewards" }
      ]}
    />
  );
}
